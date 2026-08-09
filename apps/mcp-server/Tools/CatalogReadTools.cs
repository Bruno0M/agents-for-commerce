using System.ComponentModel;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;
using ShopifySharp;

namespace McpServer.Tools;

[McpServerToolType]
public class CatalogReadTools(ShopifyGraphServiceFactory shopifyGraphServiceFactory)
{
    // Products connection page size (ticket 01). The Admin GraphQL API charges by
    // calculated cost, not by request: this query's nested variants(first: 50) +
    // metafields(first: 20) selection (ProductFields, shared with GetProductContent)
    // makes each product node cost ~71 points, so first: 10 already sits at ~710 of
    // the default 1000-point bucket — first: 25 or 50 would blow past the bucket on
    // a single page. THROTTLED on the *next* page is the expected steady state for a
    // multi-page read, not an error case; see FetchCatalogPageAsync.
    private const int CatalogPageSize = 10;

    // Explicit safety cap (ticket 01, acceptance criterion 4): a catalog read has no
    // caller-supplied handle to size the response by, so without a ceiling a 400-product
    // store would silently return a response nobody can consume. When the store has
    // more than this many active products, GetProductCatalog stops here and says so
    // via ProductCatalogReadResult.ReachedProductLimit instead of truncating silently.
    private const int MaxProductsPerCatalogRead = 50;

    private const int ThrottleRetryDelaySeconds = 2;
    private const int MaxThrottleRetries = 6;

    [McpServerTool]
    [Description("Lê o conteúdo atual de uma PDP a partir do catálogo Shopify (Admin GraphQL API): descrição, specs (opções, variantes, metafields) e indicação de schema.org presente/ausente. Serve de entrada para a tool de geração de conteúdo.")]
    public async Task<ProductCatalogContent> GetProductContent(
        [Description("Handle (slug) ou ID do produto na Shopify. Aceita handle ('camiseta-azul'), ID numérico ('123456789') ou GID completo ('gid://shopify/Product/123456789').")]
        string productIdentifier,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(productIdentifier))
        {
            throw new McpException("O identificador do produto (handle ou ID) não pode ser vazio.");
        }

        var graphRequest = BuildProductQuery(productIdentifier);

        ProductQueryResult? result;
        try
        {
            var shopifyGraphService = await shopifyGraphServiceFactory.CreateAsync(cancellationToken);
            var graphResult = await shopifyGraphService.PostAsync<ProductQueryResult>(graphRequest, cancellationToken);
            result = graphResult.Data;
        }
        catch (ShopifyAccessTokenException ex)
        {
            throw new McpException($"Não foi possível autenticar na Shopify: {ex.Message}");
        }
        catch (ShopifyGraphErrorsException ex)
        {
            throw new McpException(
                $"A consulta ao catálogo Shopify é inválida: {string.Join("; ", ex.GraphErrors.Select(e => e.Message))}");
        }
        catch (ShopifyRateLimitException)
        {
            throw new McpException(
                "A API da Shopify está limitando as requisições no momento (rate limit). Tente novamente em alguns segundos.");
        }
        catch (ShopifyException ex)
        {
            // Base type for HTTP-level failures against the Shopify API — token
            // inválido, loja fora do ar, domínio errado, etc.
            throw new McpException($"Não foi possível acessar a API da Shopify: {ex.Message}");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new McpException($"A API da Shopify parece estar fora do ar: {ex.Message}");
        }

        var product = result?.Product;
        if (product is null)
        {
            throw new McpException($"Nenhum produto encontrado na Shopify para o identificador '{productIdentifier}'.");
        }

        return ProductCatalogContent.FromGraphProduct(product);
    }

    // Description attribute arguments must be compile-time constants, so the cap
    // below is a literal, not an interpolation of MaxProductsPerCatalogRead — keep
    // the two in sync if the cap ever changes.
    [McpServerTool]
    [Description("Lê o catálogo inteiro da loja Shopify configurada (Admin GraphQL API, paginação interna via products(first, after)) — uma chamada devolve todos os produtos, sem o caller precisar saber handles de antemão. Cada item de Products tem exatamente o mesmo formato que get_product_content devolve; a lista pode ir direto para o argumento catalog de simulate_buyer_agent, sem conversão. Só produtos com status:ACTIVE entram — draft/archived não estão à venda e são ruído pro simulador. Teto de segurança de 50 produtos por chamada: se a loja tiver mais, ReachedProductLimit vem true e Products traz só os primeiros 50 — a resposta diz isso explicitamente em vez de truncar em silêncio.")]
    public async Task<ProductCatalogReadResult> GetProductCatalog(CancellationToken cancellationToken)
    {
        var pages = new List<CatalogPage>();
        string? cursor = null;
        var collected = 0;

        do
        {
            var page = await FetchCatalogPageAsync(cursor, cancellationToken);
            pages.Add(new CatalogPage(page.Nodes, page.HasNextPage));
            collected += page.Nodes.Count;
            cursor = page.EndCursor;

            if (!page.HasNextPage)
            {
                break;
            }
        } while (collected < MaxProductsPerCatalogRead);

        return AssembleCatalog(pages, MaxProductsPerCatalogRead);
    }

    // Pure assembly step (ticket 01 testing decision): turns already-fetched pages
    // into the response shape, deciding ReachedProductLimit without ever touching the
    // network — the loop above is the only I/O, so this is what the unit tests drive
    // directly across more-than-one-page fixtures instead of mocking GraphService
    // (which ShopifyGraphServiceFactory can't do without an interface it doesn't have).
    //
    // A page's own PageInfo.hasNextPage is enough to resolve the exact-boundary case
    // (collected count lands on the cap on the last item of a page) without an extra
    // lookahead query: if the cap is hit mid-page there are necessarily more real
    // items right there in that same page, so the limit was reached regardless of
    // hasNextPage; if it's hit exactly at the end of a page, hasNextPage says whether
    // the store actually has more.
    internal static ProductCatalogReadResult AssembleCatalog(IEnumerable<CatalogPage> pages, int limit)
    {
        var products = new List<ProductCatalogContent>();
        var reachedLimit = false;

        foreach (var page in pages)
        {
            foreach (var node in page.Nodes)
            {
                if (products.Count == limit)
                {
                    reachedLimit = true;
                    break;
                }

                products.Add(ProductCatalogContent.FromGraphProduct(node));
            }

            if (reachedLimit)
            {
                break;
            }

            if (products.Count == limit)
            {
                reachedLimit = page.HasNextPage;
                break;
            }
        }

        return new ProductCatalogReadResult(products, reachedLimit, limit);
    }

    private async Task<(IReadOnlyList<GraphProduct> Nodes, bool HasNextPage, string? EndCursor)> FetchCatalogPageAsync(
        string? cursor, CancellationToken cancellationToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                var graphRequest = BuildCatalogPageQuery(cursor);
                var shopifyGraphService = await shopifyGraphServiceFactory.CreateAsync(cancellationToken);
                var graphResult = await shopifyGraphService.PostAsync<ProductsConnectionQueryResult>(graphRequest, cancellationToken);
                var connection = graphResult.Data?.Products;
                if (connection is null)
                {
                    throw new McpException("A Shopify não retornou a lista de produtos para esta página do catálogo.");
                }

                return (connection.Nodes, connection.PageInfo.HasNextPage, connection.PageInfo.EndCursor);
            }
            catch (ShopifyAccessTokenException ex)
            {
                throw new McpException($"Não foi possível autenticar na Shopify: {ex.Message}");
            }
            catch (ShopifyGraphErrorsException ex)
            {
                throw new McpException(
                    $"A consulta ao catálogo Shopify é inválida: {string.Join("; ", ex.GraphErrors.Select(e => e.Message))}");
            }
            catch (ShopifyRateLimitException ex) when (attempt < MaxThrottleRetries)
            {
                // Expected steady state for a multi-page read (see CatalogPageSize),
                // not an error: back off and retry the same page instead of
                // converting straight to McpException like GetProductContent does for
                // its single read. Prefer Shopify's own RetryAfterSeconds (how long
                // until the leaky bucket has room for this query's cost again) when
                // the API supplies it; ThrottleRetryDelaySeconds is just the fallback.
                var delaySeconds = ex.RetryAfterSeconds ?? ThrottleRetryDelaySeconds;
                await Task.Delay(TimeSpan.FromSeconds(delaySeconds), cancellationToken);
            }
            catch (ShopifyRateLimitException ex)
            {
                throw new McpException(
                    $"A API da Shopify continua limitando as requisições (rate limit) após {MaxThrottleRetries} tentativas de reler esta página do catálogo. Tente novamente mais tarde. Detalhe: {ex.Message}");
            }
            catch (ShopifyException ex)
            {
                // Base type for HTTP-level failures against the Shopify API — token
                // inválido, loja fora do ar, domínio errado, etc.
                throw new McpException($"Não foi possível acessar a API da Shopify: {ex.Message}");
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                throw new McpException($"A API da Shopify parece estar fora do ar: {ex.Message}");
            }
        }
    }

    private static GraphRequest BuildCatalogPageQuery(string? cursor)
    {
        var variables = new Dictionary<string, object>
        {
            ["first"] = CatalogPageSize,
            ["query"] = "status:ACTIVE",
        };
        if (cursor is not null)
        {
            variables["after"] = cursor;
        }

        return new GraphRequest { Query = CatalogPageQuery, Variables = variables };
    }

    private static GraphRequest BuildProductQuery(string productIdentifier)
    {
        var isGid = productIdentifier.StartsWith("gid://", StringComparison.Ordinal);
        var isNumericId = productIdentifier.All(char.IsAsciiDigit);

        if (isGid || isNumericId)
        {
            var id = isGid ? productIdentifier : $"gid://shopify/Product/{productIdentifier}";
            return new GraphRequest
            {
                Query = ProductByIdQuery,
                Variables = new Dictionary<string, object> { ["id"] = id },
            };
        }

        return new GraphRequest
        {
            Query = ProductByHandleQuery,
            Variables = new Dictionary<string, object> { ["handle"] = productIdentifier },
        };
    }

    // Both queries alias their root field to "product" so a single result type
    // (ProductQueryResult) can deserialize either response.
    private const string ProductFields = """
        id
        handle
        title
        descriptionHtml
        vendor
        productType
        status
        tags
        onlineStoreUrl
        options {
            name
            values
        }
        variants(first: 50) {
            nodes {
                id
                title
                sku
                price
                availableForSale
                inventoryQuantity
                selectedOptions {
                    name
                    value
                }
            }
        }
        metafields(first: 20) {
            nodes {
                namespace
                key
                value
                type
            }
        }
        """;

    private static readonly string ProductByHandleQuery = $$"""
        query GetProductByHandle($handle: String!) {
            product: productByHandle(handle: $handle) {
                {{ProductFields}}
            }
        }
        """;

    private static readonly string ProductByIdQuery = $$"""
        query GetProductById($id: ID!) {
            product(id: $id) {
                {{ProductFields}}
            }
        }
        """;

    // $after and $query are nullable on the products connection; BuildCatalogPageQuery
    // omits the "after" variable entirely on the first page instead of sending an
    // explicit null.
    private static readonly string CatalogPageQuery = $$"""
        query GetCatalogPage($first: Int!, $after: String, $query: String) {
            products(first: $first, after: $after, query: $query) {
                pageInfo {
                    hasNextPage
                    endCursor
                }
                nodes {
                    {{ProductFields}}
                }
            }
        }
        """;
}

internal sealed class ProductQueryResult
{
    public GraphProduct? Product { get; set; }
}

internal sealed class ProductsConnectionQueryResult
{
    public GraphProductConnection? Products { get; set; }
}

internal sealed class GraphProductConnection
{
    public GraphPageInfo PageInfo { get; set; } = new();
    public IReadOnlyList<GraphProduct> Nodes { get; set; } = [];
}

internal sealed class GraphPageInfo
{
    public bool HasNextPage { get; set; }
    public string? EndCursor { get; set; }
}

/// <summary>
/// One already-fetched page of the <c>products</c> connection (ticket 01) — carries
/// just enough to let <see cref="CatalogReadTools.AssembleCatalog"/> decide
/// <see cref="ProductCatalogReadResult.ReachedProductLimit"/> without making another
/// network call: <see cref="HasNextPage"/> is this page's own <c>pageInfo.hasNextPage</c>,
/// which is only needed to resolve the exact-boundary case (the cap lands precisely on
/// the last item of a page).
/// </summary>
internal sealed record CatalogPage(IReadOnlyList<GraphProduct> Nodes, bool HasNextPage);

internal sealed class GraphProduct
{
    public required string Id { get; set; }
    public required string Handle { get; set; }
    public required string Title { get; set; }
    public string? DescriptionHtml { get; set; }
    public string? Vendor { get; set; }
    public string? ProductType { get; set; }
    public required string Status { get; set; }
    public IReadOnlyList<string> Tags { get; set; } = [];
    public string? OnlineStoreUrl { get; set; }
    public IReadOnlyList<GraphProductOption> Options { get; set; } = [];
    public GraphProductVariantConnection Variants { get; set; } = new();
    public GraphMetafieldConnection Metafields { get; set; } = new();
}

internal sealed class GraphProductOption
{
    public required string Name { get; set; }
    public IReadOnlyList<string> Values { get; set; } = [];
}

internal sealed class GraphProductVariantConnection
{
    public IReadOnlyList<GraphProductVariant> Nodes { get; set; } = [];
}

internal sealed class GraphProductVariant
{
    public required string Id { get; set; }
    public required string Title { get; set; }
    public string? Sku { get; set; }
    public string? Price { get; set; }
    public bool AvailableForSale { get; set; }
    public int? InventoryQuantity { get; set; }
    public IReadOnlyList<GraphSelectedOption> SelectedOptions { get; set; } = [];
}

internal sealed class GraphSelectedOption
{
    public required string Name { get; set; }
    public required string Value { get; set; }
}

internal sealed class GraphMetafieldConnection
{
    public IReadOnlyList<GraphMetafield> Nodes { get; set; } = [];
}

internal sealed class GraphMetafield
{
    public required string Namespace { get; set; }
    public required string Key { get; set; }
    public string? Value { get; set; }
    public string? Type { get; set; }
}

/// <summary>
/// Structured PDP content — the single catalog shape that flows through the whole
/// GEO loop of prova (ticket 01): <c>CatalogReadTools.GetProductContent</c> produces
/// it straight from Shopify (<see cref="GeneratedProperties"/> empty — nothing has
/// been extracted yet), and <c>ContentGenerationTools.GenerateOptimizedContent</c>
/// (ticket 05) produces the optimized version of the very same type — via a
/// <c>with</c> expression over the original, so <see cref="Options"/>,
/// <see cref="Metafields"/>, <see cref="ProductType"/> etc. carry over unchanged and
/// only <see cref="DescriptionHtml"/> (replaced by the optimized description) and
/// <see cref="GeneratedProperties"/> (populated with specs extracted from the loose
/// description text) change. <c>BuyerAgentSimulatorTools.SimulateBuyerAgent</c> takes
/// a list of this same type as its catalog argument, so the "depois" round runs by
/// passing the generation output straight through — no manual conversion.
/// </summary>
public record ProductCatalogContent(
    string Id,
    string Handle,
    string Title,
    string? DescriptionHtml,
    string? Vendor,
    string? ProductType,
    string Status,
    IReadOnlyList<string> Tags,
    string? OnlineStoreUrl,
    IReadOnlyList<ProductOptionContent> Options,
    IReadOnlyList<ProductVariantContent> Variants,
    IReadOnlyList<ProductMetafieldContent> Metafields,
    bool HasSchemaOrgMarkup,
    IReadOnlyList<GeneratedAdditionalProperty> GeneratedProperties)
{
    internal static ProductCatalogContent FromGraphProduct(GraphProduct product) => new(
        product.Id,
        product.Handle,
        product.Title,
        product.DescriptionHtml,
        product.Vendor,
        product.ProductType,
        product.Status,
        product.Tags,
        product.OnlineStoreUrl,
        [.. product.Options.Select(o => new ProductOptionContent(o.Name, o.Values))],
        [.. product.Variants.Nodes.Select(v => new ProductVariantContent(
            v.Id,
            v.Title,
            v.Sku,
            v.Price,
            v.AvailableForSale,
            v.InventoryQuantity,
            [.. v.SelectedOptions.Select(so => new ProductSelectedOption(so.Name, so.Value))]))],
        [.. product.Metafields.Nodes.Select(m => new ProductMetafieldContent(m.Namespace, m.Key, m.Value, m.Type))],
        HasSchemaOrgMarkup: HasEmbeddedJsonLd(product.DescriptionHtml),
        GeneratedProperties: []);

    // A Shopify product's Admin API data has no dedicated schema.org field — the only
    // place structured markup could plausibly already live is a <script type="application/ld+json">
    // block hand-embedded in the description HTML. Absence here just means "not yet
    // generated", which is exactly the gap ticket 05 fills.
    private static bool HasEmbeddedJsonLd(string? descriptionHtml) =>
        !string.IsNullOrEmpty(descriptionHtml)
        && descriptionHtml.Contains("application/ld+json", StringComparison.OrdinalIgnoreCase);
}

public record ProductOptionContent(string Name, IReadOnlyList<string> Values);

public record ProductVariantContent(
    string Id,
    string Title,
    string? Sku,
    string? Price,
    bool AvailableForSale,
    int? InventoryQuantity,
    IReadOnlyList<ProductSelectedOption> SelectedOptions);

public record ProductSelectedOption(string Name, string Value);

public record ProductMetafieldContent(string Namespace, string Key, string? Value, string? Type);

/// <summary>
/// Output of <c>get_product_catalog</c> (ticket 01). <see cref="Products"/> is a plain
/// list of the exact same <see cref="ProductCatalogContent"/> shape <c>get_product_content</c>
/// returns per item — no wrapper field leaks into it — so it can be passed straight into
/// <c>simulate_buyer_agent</c>'s <c>catalog</c> argument with no conversion, same as a
/// hand-assembled list of <c>get_product_content</c> calls would be.
///
/// <see cref="ReachedProductLimit"/> and <see cref="ProductLimit"/> exist so a truncated
/// read is never silent (ticket 01, acceptance criterion 4): when the store has more
/// active products than <see cref="ProductLimit"/>, <see cref="Products"/> only holds the
/// first <see cref="ProductLimit"/> of them and <see cref="ReachedProductLimit"/> is
/// <c>true</c> — the caller has to notice, rather than unknowingly working off a partial
/// catalog it believes is complete.
/// </summary>
public record ProductCatalogReadResult(
    IReadOnlyList<ProductCatalogContent> Products,
    bool ReachedProductLimit,
    int ProductLimit);
