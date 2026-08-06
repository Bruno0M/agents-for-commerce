using System.ComponentModel;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;
using ShopifySharp;

namespace McpServer.Tools;

/// <summary>
/// Lands the per-product data half of GEO content in the store (ticket 08) — the half
/// <c>publish_suggestion</c> (ticket 07) deliberately doesn't touch, because a Task
/// Board item becomes a code PR, and specs-per-product have no code file to land in
/// (<c>.deco/blocks/*.json</c> is section/layout config, not product content).
///
/// Both tools here are post-approval actions: they write straight to the live store
/// with no Task Board gate of their own. That's the decision the ticket asked to be
/// closed and recorded — write happens <b>after</b> a human has approved the
/// <c>publish_suggestion</c> item for the same <see cref="ContentGenerationResult"/>,
/// not before. "Before" would be simpler to demo, but would mean this server writes to
/// the store on its own initiative — the exact thing <c>publish_suggestion</c>'s own
/// description promises never happens. Nothing here enforces the ordering
/// mechanically (there's no Task Board API in this codebase that reports item review
/// status back to a tool call); the guarantee is procedural, carried by the tool
/// description an agent reads before calling it, same trust boundary <c>publish_suggestion</c>
/// itself already relies on for "never applies the change directly."
/// </summary>
[McpServerToolType]
public class ProductMetafieldTools(ShopifyGraphServiceFactory shopifyGraphServiceFactory)
{
    // Matches the project's own term for the discipline (CONTEXT.md: "GEO (Generative
    // Engine Optimization)") — short enough to satisfy Shopify's 3-char namespace
    // minimum, and namespaced so ClearProductMetafields can undo exactly what this
    // tool wrote without touching a seller's own unrelated metafields.
    private const string MetafieldNamespace = "geo";
    private const string MetafieldType = "single_line_text_field";

    [McpServerTool]
    [Description("Escreve como metafields do produto (namespace 'geo') as specs extraídas da descrição por generate_optimized_content (OptimizedCatalog.GeneratedProperties) — o dado por produto que publish_suggestion não tem onde aterrissar em código. Chamar só depois de a sugestão correspondente ter sido aprovada no Task Board (publish_suggestion + aprovação humana); esta tool não passa pelo gate — ela É a ação pós-aprovação.")]
    public async Task<WriteProductMetafieldsResult> WriteProductMetafields(
        [Description("Resultado de generate_optimized_content já aprovado — o mesmo objeto passado a publish_suggestion. OptimizedCatalog.Id (GID do produto) e OptimizedCatalog.GeneratedProperties (specs extraídas da descrição) são o que esta tool grava.")]
        ContentGenerationResult suggestion,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(suggestion);

        var product = suggestion.OptimizedCatalog;
        if (product.GeneratedProperties.Count == 0)
        {
            return new WriteProductMetafieldsResult(product.Id, []);
        }

        var metafieldInputs = product.GeneratedProperties
            .Select(spec => new
            {
                ownerId = product.Id,
                @namespace = MetafieldNamespace,
                key = MetafieldKeySlugifier.Slugify(spec.Name),
                value = spec.Value,
                type = MetafieldType,
            })
            .ToList<object>();

        var graphRequest = new GraphRequest
        {
            Query = MetafieldsSetMutation,
            Variables = new Dictionary<string, object> { ["metafields"] = metafieldInputs },
        };

        var payload = await ExecuteAsync<MetafieldsSetResult>(graphRequest, cancellationToken);
        var setPayload = payload?.MetafieldsSet;

        if (setPayload is null)
        {
            throw new McpException("A Shopify não retornou resultado para a escrita de metafields.");
        }

        if (setPayload.UserErrors.Count > 0)
        {
            throw new McpException(
                $"A Shopify recusou a escrita de um ou mais metafields: {string.Join("; ", setPayload.UserErrors.Select(e => e.Message))}");
        }

        var written = product.GeneratedProperties
            .Select(spec => new WrittenMetafield(MetafieldNamespace, MetafieldKeySlugifier.Slugify(spec.Name), spec.Value, spec.Name))
            .ToList();

        return new WriteProductMetafieldsResult(product.Id, written);
    }

    [McpServerTool]
    [Description("Remove todos os metafields do namespace 'geo' de um produto — caminho de rollback para voltar a loja ao estado 'antes' (ticket 17) e poder regravar a demo sem herdar specs de uma rodada anterior. Não toca metafields de outros namespaces.")]
    public async Task<ClearProductMetafieldsResult> ClearProductMetafields(
        [Description("Handle (slug) ou ID do produto na Shopify. Aceita handle, ID numérico ou GID completo — mesmo identificador aceito por get_product_content.")]
        string productIdentifier,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(productIdentifier))
        {
            throw new McpException("O identificador do produto (handle ou ID) não pode ser vazio.");
        }

        var lookupRequest = BuildLookupQuery(productIdentifier);
        var lookupPayload = await ExecuteAsync<MetafieldsLookupResult>(lookupRequest, cancellationToken);
        var product = lookupPayload?.Product;

        if (product is null)
        {
            throw new McpException($"Nenhum produto encontrado na Shopify para o identificador '{productIdentifier}'.");
        }

        var existing = product.Metafields.Nodes;
        if (existing.Count == 0)
        {
            return new ClearProductMetafieldsResult(product.Id, []);
        }

        var identifiers = existing
            .Select(m => new { ownerId = product.Id, @namespace = m.Namespace, key = m.Key })
            .ToList<object>();

        var deleteRequest = new GraphRequest
        {
            Query = MetafieldsDeleteMutation,
            Variables = new Dictionary<string, object> { ["metafields"] = identifiers },
        };

        var deletePayload = await ExecuteAsync<MetafieldsDeleteResult>(deleteRequest, cancellationToken);
        var deleteResult = deletePayload?.MetafieldsDelete;

        if (deleteResult is null)
        {
            throw new McpException("A Shopify não retornou resultado para a remoção de metafields.");
        }

        if (deleteResult.UserErrors.Count > 0)
        {
            throw new McpException(
                $"A Shopify recusou a remoção de um ou mais metafields: {string.Join("; ", deleteResult.UserErrors.Select(e => e.Message))}");
        }

        return new ClearProductMetafieldsResult(product.Id, [.. existing.Select(m => m.Key)]);
    }

    private async Task<T?> ExecuteAsync<T>(GraphRequest graphRequest, CancellationToken cancellationToken)
        where T : class
    {
        try
        {
            var shopifyGraphService = await shopifyGraphServiceFactory.CreateAsync(cancellationToken);
            var graphResult = await shopifyGraphService.PostAsync<T>(graphRequest, cancellationToken);
            return graphResult.Data;
        }
        catch (ShopifyAccessTokenException ex)
        {
            throw new McpException($"Não foi possível autenticar na Shopify: {ex.Message}");
        }
        catch (ShopifyGraphErrorsException ex)
        {
            throw new McpException(
                $"A operação na Shopify é inválida: {string.Join("; ", ex.GraphErrors.Select(e => e.Message))}");
        }
        catch (ShopifyRateLimitException)
        {
            throw new McpException(
                "A API da Shopify está limitando as requisições no momento (rate limit). Tente novamente em alguns segundos.");
        }
        catch (ShopifyException ex)
        {
            throw new McpException($"Não foi possível acessar a API da Shopify: {ex.Message}");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new McpException($"A API da Shopify parece estar fora do ar: {ex.Message}");
        }
    }

    // Deliberately not shared with CatalogReadTools.BuildProductQuery: same
    // handle/id/GID branching, but this ticket's diff stays self-contained rather
    // than reaching into ticket 01/04/17's already-done, already-tested file.
    private static GraphRequest BuildLookupQuery(string productIdentifier)
    {
        var isGid = productIdentifier.StartsWith("gid://", StringComparison.Ordinal);
        var isNumericId = productIdentifier.All(char.IsAsciiDigit);

        if (isGid || isNumericId)
        {
            var id = isGid ? productIdentifier : $"gid://shopify/Product/{productIdentifier}";
            return new GraphRequest
            {
                Query = MetafieldsByIdQuery,
                Variables = new Dictionary<string, object> { ["id"] = id, ["namespace"] = MetafieldNamespace },
            };
        }

        return new GraphRequest
        {
            Query = MetafieldsByHandleQuery,
            Variables = new Dictionary<string, object> { ["handle"] = productIdentifier, ["namespace"] = MetafieldNamespace },
        };
    }

    private const string MetafieldsSetMutation = """
        mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
                metafields { namespace key value type }
                userErrors { field message code }
            }
        }
        """;

    private const string MetafieldsDeleteMutation = """
        mutation DeleteMetafields($metafields: [MetafieldIdentifierInput!]!) {
            metafieldsDelete(metafields: $metafields) {
                deletedMetafields { key namespace ownerId }
                userErrors { field message }
            }
        }
        """;

    private const string MetafieldsFields = """
        id
        metafields(namespace: $namespace, first: 50) {
            nodes { namespace key value type }
        }
        """;

    private static readonly string MetafieldsByHandleQuery = $$"""
        query GetProductMetafieldsByHandle($handle: String!, $namespace: String!) {
            product: productByHandle(handle: $handle) {
                {{MetafieldsFields}}
            }
        }
        """;

    private static readonly string MetafieldsByIdQuery = $$"""
        query GetProductMetafieldsById($id: ID!, $namespace: String!) {
            product(id: $id) {
                {{MetafieldsFields}}
            }
        }
        """;
}

internal sealed class MetafieldsSetResult
{
    public MetafieldsSetPayload? MetafieldsSet { get; set; }
}

internal sealed class MetafieldsSetPayload
{
    public IReadOnlyList<GraphUserError> UserErrors { get; set; } = [];
}

internal sealed class MetafieldsDeleteResult
{
    public MetafieldsDeletePayload? MetafieldsDelete { get; set; }
}

internal sealed class MetafieldsDeletePayload
{
    public IReadOnlyList<GraphUserError> UserErrors { get; set; } = [];
}

internal sealed class GraphUserError
{
    public IReadOnlyList<string> Field { get; set; } = [];
    public required string Message { get; set; }
}

internal sealed class MetafieldsLookupResult
{
    public MetafieldsLookupProduct? Product { get; set; }
}

internal sealed class MetafieldsLookupProduct
{
    public required string Id { get; set; }
    public GraphMetafieldConnection Metafields { get; set; } = new();
}

/// <summary>
/// Output of <c>write_product_metafields</c>. <see cref="Written"/> is empty when
/// <c>OptimizedCatalog.GeneratedProperties</c> had nothing to write (no loose specs
/// were extracted from the description) — not an error, the product just had no gap
/// to close.
/// </summary>
public record WriteProductMetafieldsResult(string ProductId, IReadOnlyList<WrittenMetafield> Written);

/// <summary>
/// One metafield actually written. <see cref="SourceSpecName"/> is the human-readable
/// name the spec was extracted under (<c>GeneratedAdditionalProperty.Name</c>) — kept
/// alongside <see cref="Key"/> (the slugified, Shopify-legal machine key) because the
/// two diverge for any name with accents, spaces or uppercase, and a reviewer needs
/// the mapping to recognize the metafield on the live store as "the same spec".
/// </summary>
public record WrittenMetafield(string Namespace, string Key, string Value, string SourceSpecName);

/// <summary>
/// Output of <c>clear_product_metafields</c>. <see cref="DeletedKeys"/> is empty when
/// the product had no 'geo'-namespace metafields to begin with.
/// </summary>
public record ClearProductMetafieldsResult(string ProductId, IReadOnlyList<string> DeletedKeys);

/// <summary>
/// Converts a human-readable spec name (e.g. "Cancelamento de ruído") into a key
/// Shopify's metafield API accepts: lowercase ASCII letters, digits and underscores,
/// 64 characters max. Shopify metafield keys can never be the buyer-facing name
/// themselves (ticket 03's <see cref="PropertyRelevanceFilter"/> drops
/// <c>Source == "metafield"</c> candidates for exactly this reason — the loader
/// surfaces a metafield's raw <c>key</c> as its <c>additionalProperty</c> name, with no
/// access to the metafield definition's separate human-readable display name). This is
/// the closest a written-back key can get to readable without touching the storefront
/// loader: a lossy but recognizable transliteration, not a hash or a made-up code.
/// </summary>
internal static partial class MetafieldKeySlugifier
{
    private const int MaxKeyLength = 64;
    private const string FallbackKey = "spec";

    internal static string Slugify(string name)
    {
        var decomposed = name.Normalize(NormalizationForm.FormD);
        var withoutDiacritics = string.Concat(
            decomposed.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark));

        var slug = NonAlphanumericRun().Replace(withoutDiacritics.ToLowerInvariant(), "_").Trim('_');

        if (slug.Length == 0)
        {
            return FallbackKey;
        }

        return slug.Length > MaxKeyLength ? slug[..MaxKeyLength].Trim('_') : slug;
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlphanumericRun();
}
