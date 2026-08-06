using System.ComponentModel;
using System.Text.Json;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

[McpServerToolType]
public class BuyerAgentSimulatorTools(AiGatewayClient aiGatewayClient, AiGatewayOptions aiGatewayOptions)
{
    [McpServerTool]
    [Description("Simula um agente comprador (mecânica genérica de 2 etapas — ver docs/ideia-central-geo-validacao.md §4.1): extrai os requisitos obrigatórios de um pedido em linguagem natural, filtra à risca contra o dado estruturado de cada produto do catálogo informado e, havendo mais de um candidato remanescente, desempata por diferenciais/sinais estruturados. Rode a mesma tool contra a versão atual e a versão otimizada (generate_optimized_content) do mesmo catálogo de teste para comparar a taxa de sucesso antes/depois.")]
    public async Task<BuyerAgentSimulationResult> SimulateBuyerAgent(
        [Description("Pedido em linguagem natural do comprador simulado (ex: 'me acha um fone bluetooth com cancelamento de ruído até R$300').")]
        string naturalLanguageOrder,
        [Description("Catálogo de teste contra o qual simular, no formato retornado por get_product_content (ticket 04) — passe a versão atual ou a otimizada para comparar antes/depois.")]
        IReadOnlyList<ProductCatalogContent> catalog,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(naturalLanguageOrder))
        {
            throw new McpException("O pedido em linguagem natural não pode ser vazio.");
        }

        ArgumentNullException.ThrowIfNull(catalog);
        if (catalog.Count == 0)
        {
            throw new McpException("O catálogo informado está vazio — nada para simular.");
        }

        var requirements = await ExtractRequirementsAsync(aiGatewayClient, aiGatewayOptions, naturalLanguageOrder, cancellationToken);
        var candidates = catalog.Select(ToCandidateProduct).ToList();

        return BuyerAgentDecisionEngine.Simulate(requirements, candidates);
    }

    // Static (not an instance method on this class) so BeforeAfterComparisonTools
    // (ticket 04) can extract requirements once from an AiGatewayClient/AiGatewayOptions
    // it injects itself, and reuse the same BuyerOrderRequirements for both the
    // "antes" and "depois" rounds — two independent extractions (one per round) would
    // let AI Gateway non-determinism change *what's being asked* between rounds, not
    // just what the catalog can confirm, defeating the point of an antes/depois delta.
    internal static async Task<BuyerOrderRequirements> ExtractRequirementsAsync(
        AiGatewayClient aiGatewayClient,
        AiGatewayOptions aiGatewayOptions,
        string naturalLanguageOrder,
        CancellationToken cancellationToken)
    {
        AiGatewayCompletionResult completion;
        try
        {
            completion = await aiGatewayClient.CompleteAsync(
                aiGatewayOptions.Model,
                [
                    new AiGatewayMessage("system", RequirementExtractionSystemPrompt),
                    new AiGatewayMessage("user", naturalLanguageOrder),
                ],
                maxTokens: 800,
                temperature: 0.1,
                cancellationToken: cancellationToken);
        }
        catch (AiGatewayException ex)
        {
            throw new McpException($"Não foi possível extrair os requisitos do pedido via AI Gateway: {ex.Message}");
        }

        return ParseRequirements(completion.Content);
    }

    private static BuyerOrderRequirements ParseRequirements(string rawContent)
    {
        var json = StripCodeFence(rawContent);

        ExtractedRequirements? extracted;
        try
        {
            extracted = JsonSerializer.Deserialize<ExtractedRequirements>(json, ExtractionJsonOptions);
        }
        catch (JsonException ex)
        {
            throw new McpException(
                $"O AI Gateway retornou requisitos que não puderam ser interpretados como JSON válido: {ex.Message}");
        }

        if (extracted is null)
        {
            throw new McpException("O AI Gateway retornou uma resposta vazia para a extração de requisitos.");
        }

        var attributeRequirements = (extracted.AttributeRequirements ?? [])
            .Select(a => new BuyerAttributeRequirement(a.Name, a.ExpectedValue))
            .ToList();

        var numericMinimumRequirements = (extracted.MinNumericRequirements ?? [])
            .Select(n => new BuyerNumericMinimumRequirement(n.Name, n.MinValue, n.Unit))
            .ToList();

        return new BuyerOrderRequirements(attributeRequirements, extracted.MaxPrice, numericMinimumRequirements);
    }

    // The extraction prompt asks for raw JSON, but models sometimes wrap it in a
    // ```json ... ``` fence anyway — strip it instead of failing the whole call
    // (same tolerance as ContentGenerationTools, ticket 05).
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

    // Maps the unified catalog shape (ticket 01: same ProductCatalogContent read from
    // Shopify or produced by generate_optimized_content) into the generic candidate
    // shape the pure engine understands. Every structured source available on the
    // catalog becomes an attribute — options, metafields, properties extracted from
    // the description by generation (GeneratedProperties), the product type, and the
    // description text itself — not just options and metafields, which is what let a
    // required characteristic that only generation had extracted (e.g. "Impermeável")
    // go unseen by the filter even after the "depois" round ran. A fixed set of
    // well-known metafield keys is recognized as generic secondary signals
    // (rating/best-seller/return-policy/delivery), matching the examples in
    // docs/ideia-central-geo-validacao.md §4.1 — this is data recognized by name, not
    // category-specific logic, so it still works for any product type.
    internal static BuyerCandidateProduct ToCandidateProduct(ProductCatalogContent product)
    {
        var attributes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var option in product.Options)
        {
            attributes[option.Name] = string.Join(", ", option.Values);
        }

        var signals = new List<BuyerSecondarySignal>();
        foreach (var metafield in product.Metafields)
        {
            if (string.IsNullOrWhiteSpace(metafield.Value))
            {
                continue;
            }

            attributes[metafield.Key] = metafield.Value;

            if (SecondarySignalCatalog.TryGetValue(metafield.Key, out var signalSpec)
                && double.TryParse(metafield.Value, out var signalValue))
            {
                signals.Add(new BuyerSecondarySignal(signalSpec.DisplayName, signalValue, signalSpec.Direction));
            }
        }

        foreach (var generated in product.GeneratedProperties)
        {
            if (string.IsNullOrWhiteSpace(generated.Value))
            {
                continue;
            }

            attributes[generated.Name] = generated.Value;
        }

        // Added only if no more specific option/metafield/generated property already
        // claimed the name — those are more precise than these two catch-alls.
        if (!string.IsNullOrWhiteSpace(product.ProductType))
        {
            attributes.TryAdd(ProductTypeAttributeName, product.ProductType);
        }

        if (!string.IsNullOrWhiteSpace(product.DescriptionHtml))
        {
            attributes.TryAdd(DescriptionAttributeName, product.DescriptionHtml);
        }

        var price = product.Variants
            .Select(v => decimal.TryParse(v.Price, out var parsed) ? parsed : (decimal?)null)
            .Where(p => p is not null)
            .Select(p => p!.Value)
            .DefaultIfEmpty()
            .Min();
        var hasPricedVariant = product.Variants.Any(v => decimal.TryParse(v.Price, out _));

        return new BuyerCandidateProduct(
            product.Id,
            product.Title,
            hasPricedVariant ? price : null,
            attributes,
            signals);
    }

    // Matches the canonical attribute name the extraction system prompt below always
    // uses for the product-type requirement ("Sempre inclua um requisito para o tipo
    // de produto... name: 'Tipo de produto'") — without this, that near-universal
    // requirement had no structured attribute to confirm against, in either round.
    private const string ProductTypeAttributeName = "Tipo de produto";
    private const string DescriptionAttributeName = "Descrição";

    private static readonly Dictionary<string, (string DisplayName, BuyerSignalDirection Direction)> SecondarySignalCatalog =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["rating"] = ("Avaliação", BuyerSignalDirection.HigherIsBetter),
            ["avaliacao"] = ("Avaliação", BuyerSignalDirection.HigherIsBetter),
            ["best_seller_rank"] = ("Ranking mais vendido", BuyerSignalDirection.LowerIsBetter),
            ["ranking_mais_vendido"] = ("Ranking mais vendido", BuyerSignalDirection.LowerIsBetter),
            ["return_policy_days"] = ("Prazo de devolução (dias)", BuyerSignalDirection.HigherIsBetter),
            ["prazo_devolucao_dias"] = ("Prazo de devolução (dias)", BuyerSignalDirection.HigherIsBetter),
            ["delivery_days"] = ("Prazo de entrega (dias)", BuyerSignalDirection.LowerIsBetter),
            ["prazo_entrega_dias"] = ("Prazo de entrega (dias)", BuyerSignalDirection.LowerIsBetter),
        };

    private static readonly JsonSerializerOptions ExtractionJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string RequirementExtractionSystemPrompt = """
        Você é um assistente de extração de requisitos para um agente comprador simulado.
        Sua única saída é um objeto JSON estrito, sem markdown e sem texto fora do JSON.

        A partir do pedido em linguagem natural do usuário, extraia os requisitos obrigatórios
        que um produto precisa confirmar via dado estruturado para ser considerado candidato:
        tipo de produto, características obrigatórias, mínimos numéricos e uma eventual
        restrição de preço máximo.

        Responda apenas com um objeto JSON neste formato:
        {
          "attributeRequirements": [{"name": "...", "expectedValue": "..."}],
          "minNumericRequirements": [{"name": "...", "minValue": 20.0, "unit": "h"}],
          "maxPrice": 300.0
        }

        Regras:
        - Sempre inclua um requisito para o tipo de produto quando o pedido mencionar um
          (name: "Tipo de produto", expectedValue: só a categoria do produto, no singular e
          sem tecnologia/conectividade/característica — ex: "fone", não "fone bluetooth";
          "tênis", não "tênis para corrida"). Tecnologia/conectividade citada só como parte
          de descrever a categoria (ex: "bluetooth" em "fone bluetooth") NÃO vira um
          requisito à parte — é contexto, não uma exigência a confirmar. Só crie um
          requisito separado para ela se o pedido claramente exigir uma versão/capacidade
          específica dela (ex: "com Bluetooth 5.0 ou superior", "que aceite dois aparelhos
          ao mesmo tempo").
        - Um requisito por característica obrigatória distinta mencionada no pedido.
        - A confirmação casa "expectedValue" contra o texto do dado estruturado do produto
          por substring — nunca use "sim"/"não" como expectedValue para uma característica
          ligar/desligar (ex: cancelamento de ruído, resistência à água), porque uma
          especificação real de produto não escreve "sim", escreve a condição em si (ex:
          "ativo", "presente", "IPX7"). Use o adjetivo/particípio que descreveria a
          característica numa ficha técnica, não uma resposta de sim/não.
        - Quando o pedido exigir um mínimo numérico para uma característica ("pelo menos X
          horas", "no mínimo Y", "acima de Z"), NÃO coloque em "attributeRequirements" — o
          dado estruturado do produto é prosa (ex: "Até 28 horas com o estojo"), então
          confirmar por substring nunca funciona para uma comparação "≥". Coloque em
          "minNumericRequirements": {"name": o nome da característica, "minValue": o número
          mínimo, "unit": a unidade abreviada se houver (ex: "h", "km"), ou null.
        - "maxPrice": o valor numérico do limite de preço, se houver, sem símbolo de moeda.
          Sem restrição de preço no pedido, retorne null.
        - Nunca invente um requisito que não esteja implícito ou explícito no pedido.
        """;
}

internal sealed record ExtractedRequirements(
    IReadOnlyList<ExtractedAttributeRequirement>? AttributeRequirements,
    IReadOnlyList<ExtractedNumericMinimumRequirement>? MinNumericRequirements,
    decimal? MaxPrice);

internal sealed record ExtractedNumericMinimumRequirement(string Name, decimal MinValue, string? Unit);

internal sealed record ExtractedAttributeRequirement(string Name, string ExpectedValue);
