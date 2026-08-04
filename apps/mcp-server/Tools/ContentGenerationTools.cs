using System.ComponentModel;
using System.Text.Json;
using System.Text.Json.Nodes;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

[McpServerToolType]
public class ContentGenerationTools(AiGatewayClient aiGatewayClient, AiGatewayOptions aiGatewayOptions)
{
    private const string DefaultCurrencyCode = "BRL";

    [McpServerTool]
    [Description("Gera a versão otimizada (GEO) do conteúdo de uma PDP a partir do output de get_product_content: schema.org Product + Offer/AggregateOffer, specs estruturadas (additionalProperty) e, quando há base factual suficiente, uma seção de FAQ estruturada (FAQPage) com respostas diretas a perguntas de comparação. O resultado inclui OptimizedCatalog no mesmo formato de get_product_content — passe-o direto para simulate_buyer_agent (rodada 'depois'), sem conversão manual.")]
    public async Task<ContentGenerationResult> GenerateOptimizedContent(
        [Description("Conteúdo atual do produto, no formato retornado por get_product_content (ticket 04).")]
        ProductCatalogContent product,
        [Description("Código de moeda ISO 4217 para o schema.org Offer (ex: 'BRL', 'USD'). A Shopify Admin API não expõe isso no formato lido pelo ticket 04 — default 'BRL' se omitido.")]
        string? currencyCode = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(product);

        var extraction = await ExtractFromDescriptionAsync(product, cancellationToken);
        var optimizedDescription = string.IsNullOrWhiteSpace(extraction.DescriptionOrEmpty)
            ? product.Title
            : extraction.DescriptionOrEmpty;

        // additionalProperty for the schema.org output surfaces every structured
        // source (options + metafields + description-extracted specs) so a human
        // reviewer sees the full picture; GeneratedProperties on the unified catalog
        // (below) only carries the description-extracted ones — options and
        // metafields already have their own fields on that type, so duplicating them
        // there would just make the buyer-agent candidate assembly double-count them.
        var additionalPropertiesForJsonLd = PropertyRelevanceFilter.Filter(BuildAdditionalProperties(product, extraction));
        var extractedProperties = PropertyRelevanceFilter.Filter(
            extraction.AdditionalSpecsOrEmpty.Select(spec => new GeneratedAdditionalProperty(spec.Name, spec.Value, "description")));
        var resolvedCurrency = string.IsNullOrWhiteSpace(currencyCode) ? DefaultCurrencyCode : currencyCode;

        var productJsonLd = BuildProductJsonLd(product, optimizedDescription, additionalPropertiesForJsonLd, resolvedCurrency);
        var faqJsonLd = BuildFaqPageJsonLd(extraction.FaqOrEmpty);

        var optimizedCatalog = product with
        {
            DescriptionHtml = optimizedDescription,
            HasSchemaOrgMarkup = true,
            GeneratedProperties = extractedProperties,
        };

        return new ContentGenerationResult(
            optimizedCatalog,
            Serialize(productJsonLd),
            faqJsonLd is null ? null : Serialize(faqJsonLd));
    }

    private async Task<GenerationExtraction> ExtractFromDescriptionAsync(
        ProductCatalogContent product,
        CancellationToken cancellationToken)
    {
        var prompt = BuildExtractionPrompt(product);

        AiGatewayCompletionResult completion;
        try
        {
            completion = await aiGatewayClient.CompleteAsync(
                aiGatewayOptions.Model,
                [
                    new AiGatewayMessage("system", ExtractionSystemPrompt),
                    new AiGatewayMessage("user", prompt),
                ],
                maxTokens: 2000,
                temperature: 0.1,
                cancellationToken: cancellationToken);
        }
        catch (AiGatewayException ex)
        {
            throw new McpException($"Não foi possível gerar o conteúdo otimizado via AI Gateway: {ex.Message}");
        }

        return ParseExtraction(completion.Content);
    }

    private static GenerationExtraction ParseExtraction(string rawContent)
    {
        var json = StripCodeFence(rawContent);

        GenerationExtraction? extraction;
        try
        {
            extraction = JsonSerializer.Deserialize<GenerationExtraction>(json, ExtractionJsonOptions);
        }
        catch (JsonException ex)
        {
            throw new McpException(
                $"O AI Gateway retornou um conteúdo que não pôde ser interpretado como JSON de extração válido: {ex.Message}");
        }

        return extraction ?? throw new McpException("O AI Gateway retornou uma resposta vazia para a extração de conteúdo.");
    }

    // The extraction prompt asks for raw JSON, but models sometimes wrap it in a
    // ```json ... ``` fence anyway — strip it instead of failing the whole call.
    private static string StripCodeFence(string content)
    {
        var trimmed = content.Trim();
        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var firstNewline = trimmed.IndexOf('\n');
        var withoutOpeningFence = firstNewline >= 0 ? trimmed[(firstNewline + 1)..] : trimmed;

        var closingFenceIndex = withoutOpeningFence.LastIndexOf("```", StringComparison.Ordinal);
        return (closingFenceIndex >= 0 ? withoutOpeningFence[..closingFenceIndex] : withoutOpeningFence).Trim();
    }

    private static string BuildExtractionPrompt(ProductCatalogContent product)
    {
        var existingSpecNames = product.Options.Select(o => o.Name)
            .Concat(product.Metafields.Select(m => m.Key));

        return $$"""
            Produto: {{product.Title}}
            Marca/vendor: {{product.Vendor ?? "(não informado)"}}
            Categoria (productType): {{product.ProductType ?? "(não informado)"}}
            Tags: {{string.Join(", ", product.Tags)}}
            Specs já estruturadas (não repita): {{string.Join(", ", existingSpecNames)}}

            Descrição atual (HTML bruto — pode ter marcação solta e, eventualmente, um
            <script type="application/ld+json"> que deve ser ignorado como fonte, pois não
            reflete necessariamente o conteúdo real do produto):
            ---
            {{product.DescriptionHtml ?? "(sem descrição)"}}
            ---

            Responda apenas com um objeto JSON (sem markdown, sem texto fora do JSON) neste formato:
            {
              "description": "descrição factual e concisa (1-3 frases), sem linguagem de marketing, baseada só no conteúdo acima",
              "additionalSpecs": [{"name": "...", "value": "..."}],
              "faq": [{"question": "...", "answer": "..."}]
            }

            Regras:
            - "additionalSpecs": só specs que aparecem soltas no texto da descrição e que NÃO
              estão na lista de specs já estruturadas acima. Sem specs novas, retorne [].
            - O "name" de cada spec precisa ser um nome que um comprador reconheceria (ex:
              "Cancelamento de ruído", "Autonomia da bateria", "Resistência à água") — nunca
              jargão técnico interno, nome de campo de sistema ou abreviação de catálogo.
            - "faq": só inclua uma entrada quando a descrição contiver informação factual
              suficiente para responder, de forma direta e sem ambiguidade, uma pergunta de
              comparação típica de comprador (ex: "é impermeável?", "serve para uso externo?",
              "tem garantia?"). Nunca invente uma resposta. Sem base factual, retorne [].
            """;
    }

    private static List<GeneratedAdditionalProperty> BuildAdditionalProperties(
        ProductCatalogContent product,
        GenerationExtraction extraction)
    {
        var properties = new List<GeneratedAdditionalProperty>();

        foreach (var option in product.Options)
        {
            properties.Add(new GeneratedAdditionalProperty(option.Name, string.Join(", ", option.Values), "option"));
        }

        foreach (var metafield in product.Metafields.Where(m => !string.IsNullOrWhiteSpace(m.Value)))
        {
            properties.Add(new GeneratedAdditionalProperty(metafield.Key, metafield.Value!, "metafield"));
        }

        foreach (var spec in extraction.AdditionalSpecsOrEmpty)
        {
            properties.Add(new GeneratedAdditionalProperty(spec.Name, spec.Value, "description"));
        }

        return properties;
    }

    private static JsonObject BuildProductJsonLd(
        ProductCatalogContent product,
        string optimizedDescription,
        IReadOnlyList<GeneratedAdditionalProperty> additionalProperties,
        string currencyCode)
    {
        var node = new JsonObject
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "Product",
            ["name"] = product.Title,
            ["description"] = optimizedDescription,
            ["productID"] = product.Id,
        };

        var representativeSku = product.Variants
            .Select(v => v.Sku)
            .FirstOrDefault(sku => !string.IsNullOrWhiteSpace(sku));
        if (representativeSku is not null)
        {
            node["sku"] = representativeSku;
        }

        if (!string.IsNullOrWhiteSpace(product.Vendor))
        {
            node["brand"] = new JsonObject { ["@type"] = "Brand", ["name"] = product.Vendor };
        }

        if (!string.IsNullOrWhiteSpace(product.ProductType))
        {
            node["category"] = product.ProductType;
        }

        if (!string.IsNullOrWhiteSpace(product.OnlineStoreUrl))
        {
            node["url"] = product.OnlineStoreUrl;
        }

        if (additionalProperties.Count > 0)
        {
            node["additionalProperty"] = new JsonArray(
                [.. additionalProperties.Select(p => (JsonNode)new JsonObject
                {
                    ["@type"] = "PropertyValue",
                    ["name"] = p.Name,
                    ["value"] = p.Value,
                })]);
        }

        var offers = BuildOffersNode(product, currencyCode);
        if (offers is not null)
        {
            node["offers"] = offers;
        }

        return node;
    }

    // A single Offer for a single-variant product; an AggregateOffer (with the full
    // per-variant Offer list nested inside) once there's more than one — this is the
    // schema.org-standard shape for representing variant price ranges.
    private static JsonNode? BuildOffersNode(ProductCatalogContent product, string currencyCode)
    {
        if (product.Variants.Count == 0)
        {
            return null;
        }

        if (product.Variants.Count == 1)
        {
            return BuildOfferNode(product.Variants[0], currencyCode, product.OnlineStoreUrl);
        }

        var prices = product.Variants
            .Select(v => decimal.TryParse(v.Price, out var price) ? price : (decimal?)null)
            .Where(p => p is not null)
            .Select(p => p!.Value)
            .ToList();

        var aggregate = new JsonObject
        {
            ["@type"] = "AggregateOffer",
            ["priceCurrency"] = currencyCode,
            ["offerCount"] = product.Variants.Count,
            ["offers"] = new JsonArray(
                [.. product.Variants.Select(v => (JsonNode)BuildOfferNode(v, currencyCode, product.OnlineStoreUrl))]),
        };

        if (prices.Count > 0)
        {
            aggregate["lowPrice"] = prices.Min();
            aggregate["highPrice"] = prices.Max();
        }

        return aggregate;
    }

    private static JsonObject BuildOfferNode(ProductVariantContent variant, string currencyCode, string? url)
    {
        var offer = new JsonObject
        {
            ["@type"] = "Offer",
            ["priceCurrency"] = currencyCode,
            ["availability"] = variant.AvailableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        };

        if (!string.IsNullOrWhiteSpace(variant.Sku))
        {
            offer["sku"] = variant.Sku;
        }

        if (decimal.TryParse(variant.Price, out var price))
        {
            offer["price"] = price;
        }

        if (!string.IsNullOrWhiteSpace(url))
        {
            offer["url"] = url;
        }

        return offer;
    }

    private static JsonObject? BuildFaqPageJsonLd(IReadOnlyList<ExtractedFaqEntry> faq)
    {
        if (faq.Count == 0)
        {
            return null;
        }

        return new JsonObject
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "FAQPage",
            ["mainEntity"] = new JsonArray(
                [.. faq.Select(f => (JsonNode)new JsonObject
                {
                    ["@type"] = "Question",
                    ["name"] = f.Question,
                    ["acceptedAnswer"] = new JsonObject { ["@type"] = "Answer", ["text"] = f.Answer },
                })]),
        };
    }

    private static string Serialize(JsonNode node) => node.ToJsonString(SerializeOptions);

    private static readonly JsonSerializerOptions SerializeOptions = new() { WriteIndented = true };

    private static readonly JsonSerializerOptions ExtractionJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string ExtractionSystemPrompt = """
        Você é um assistente de extração de conteúdo para otimização GEO (Generative Engine
        Optimization) de páginas de produto. Sua única saída é um objeto JSON estrito, sem
        markdown e sem texto fora do JSON. Nunca invente informação que não esteja presente no
        conteúdo fornecido.
        """;
}

// Nullable list properties tolerate an LLM that omits an empty array instead of
// returning "[]" explicitly; the *OrEmpty accessors are what callers use.
internal sealed record GenerationExtraction(
    string? Description,
    IReadOnlyList<ExtractedSpec>? AdditionalSpecs,
    IReadOnlyList<ExtractedFaqEntry>? Faq)
{
    public string DescriptionOrEmpty => Description ?? string.Empty;
    public IReadOnlyList<ExtractedSpec> AdditionalSpecsOrEmpty => AdditionalSpecs ?? [];
    public IReadOnlyList<ExtractedFaqEntry> FaqOrEmpty => Faq ?? [];
}

internal sealed record ExtractedSpec(string Name, string Value);

internal sealed record ExtractedFaqEntry(string Question, string Answer);

/// <summary>
/// One schema.org <c>additionalProperty</c> (<c>PropertyValue</c>) entry, tagged with
/// where it came from: <c>"option"</c> (Shopify variant option), <c>"metafield"</c>
/// (Shopify metafield) or <c>"description"</c> (extracted from loose description text
/// by the AI Gateway) — lets a human reviewing the Task Board suggestion (ticket 07)
/// see which specs are newly-extracted vs. already-structured. Only the
/// <c>"description"</c>-sourced ones end up in <see cref="ProductCatalogContent.GeneratedProperties"/>
/// (ticket 01) — options and metafields already have dedicated fields there.
/// </summary>
public record GeneratedAdditionalProperty(string Name, string Value, string Source);

/// <summary>
/// Output of <c>generate_optimized_content</c>. <see cref="OptimizedCatalog"/> is the
/// same <see cref="ProductCatalogContent"/> shape <c>get_product_content</c> returns
/// (ticket 01) — pass it (wrapped in a list) straight into
/// <c>simulate_buyer_agent</c>'s <c>catalog</c> argument for the "depois" round, no
/// conversion needed. <see cref="SchemaOrgProductJsonLd"/> and
/// <see cref="SchemaOrgFaqPageJsonLd"/> are ready to drop into
/// <c>&lt;script type="application/ld+json"&gt;</c> blocks as-is; the latter is null
/// when there's no comparison-relevant FAQ to generate.
/// </summary>
public record ContentGenerationResult(
    ProductCatalogContent OptimizedCatalog,
    string SchemaOrgProductJsonLd,
    string? SchemaOrgFaqPageJsonLd);

/// <summary>
/// Deterministic relevance filter applied to every <see cref="GeneratedAdditionalProperty"/>
/// candidate before it reaches either of <c>generate_optimized_content</c>'s outputs (the
/// JSON-LD <c>additionalProperty</c> array and <see cref="ProductCatalogContent.GeneratedProperties"/>)
/// — ticket 03. No AI Gateway call, no per-category logic: two narrow, explicit, testable
/// rules, both aimed at noise a real smoke test actually produced
/// (<c>.scratch/entrega-hackathon/issues/03-filtro-relevancia-propriedades.md</c>):
///
/// <list type="number">
/// <item>Placeholder <b>values</b> Shopify auto-generates rather than a seller ever typing
/// in real product data. The canonical (and, as far as the Shopify Admin API goes, only)
/// case is <c>"Default Title"</c> — the option value (and lone variant title) every product
/// with no real variant options gets for free. It is not a spec, it is the platform's
/// stand-in for "this product has no options" — so it is dropped by value, regardless of
/// which option carried it, with a trim + case-insensitive compare (representation
/// variance, not a different class of placeholder).</item>
/// <item>Metafield <b>keys</b> as buyer-facing property <b>names</b>. Shopify constrains
/// every metafield key to a machine identifier (lowercase, digits, <c>_</c>/<c>-</c>, no
/// spaces) — a human display name lives on the metafield's separate <c>definition.name</c>,
/// which <c>CatalogReadTools</c> does not fetch. So there is no metafield key a buyer would
/// ever recognize as a spec name (the smoke test's <c>binding_mount: "Optimistic"</c> is
/// exactly this) — every <c>"metafield"</c>-sourced candidate is dropped here. Landing a
/// *readable* version of metafield-backed specs instead of just dropping them is ticket 08's
/// job, not this one.</item>
/// </list>
///
/// What survives is never renamed — <see cref="GeneratedAdditionalProperty.Source"/> stays
/// intact on every surviving entry, which is what proves extraction rather than invention
/// to a human reviewing the Task Board suggestion (and to <c>.scratch/catalogo-demo/spec.md</c>'s
/// own "Cor aparece com Source = option" check).
/// </summary>
internal static class PropertyRelevanceFilter
{
    // Shopify's literal, English, non-localized constant for "no real variant options" —
    // confirmed via the Admin API, not something a seller can rename.
    private const string DefaultTitlePlaceholderValue = "default title";

    internal static IReadOnlyList<GeneratedAdditionalProperty> Filter(
        IEnumerable<GeneratedAdditionalProperty> candidates) =>
        [.. candidates.Where(IsRelevant)];

    internal static bool IsRelevant(GeneratedAdditionalProperty property)
    {
        if (string.IsNullOrWhiteSpace(property.Value))
        {
            return false;
        }

        if (property.Source == "metafield")
        {
            return false;
        }

        if (string.Equals(property.Value.Trim(), DefaultTitlePlaceholderValue, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }
}
