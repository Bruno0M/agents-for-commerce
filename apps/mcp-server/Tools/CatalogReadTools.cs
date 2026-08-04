using System.ComponentModel;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;
using ShopifySharp;

namespace McpServer.Tools;

[McpServerToolType]
public class CatalogReadTools(ShopifyGraphServiceFactory shopifyGraphServiceFactory)
{
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
}

internal sealed class ProductQueryResult
{
    public GraphProduct? Product { get; set; }
}

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
