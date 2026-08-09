using System.ComponentModel;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

/// <summary>
/// Ticket 04 — "a rodada antes/depois: o número". Roda o mesmo pedido em linguagem
/// natural contra duas versões do mesmo catálogo (tipicamente a leitura crua de
/// <c>get_product_content</c> e a saída de <c>generate_optimized_content</c> para os
/// mesmos produtos) com os requisitos extraídos <b>uma única vez</b>, e devolve a
/// comparação produto a produto como objeto serializável — não como relatório
/// impresso. É o dado que a view do ticket 14 renderiza (ela roda sob CSP sem rede, só
/// mostra o que chega no resultado da tool) e que o ticket 18 generaliza para os
/// pedidos B, C e D.
/// </summary>
[McpServerToolType]
public class BeforeAfterComparisonTools(AiGatewayClient aiGatewayClient, AiGatewayOptions aiGatewayOptions)
{
    [McpServerTool]
    [Description("Roda o mesmo pedido em linguagem natural contra duas versões do catálogo (antes/depois) com os MESMOS requisitos extraídos uma única vez, e devolve a comparação estruturada produto a produto (requisitos confirmados e faltantes nas duas rodadas). Informe expectedOutcomes (por handle) para a taxa de sucesso ser calculada por classificação correta — quem devia passar e quem devia ser rejeitado, conforme o spec do catálogo de teste — em vez de só contar quantos passaram.")]
    public async Task<BeforeAfterComparisonResult> CompareBuyerAgentRounds(
        [Description("Pedido em linguagem natural do comprador simulado — o mesmo texto roda nas duas rodadas.")]
        string naturalLanguageOrder,
        [Description("Catálogo 'antes' (ex: lido de um artefato congelado, ver ticket 17), no formato retornado por get_product_content.")]
        IReadOnlyList<ProductCatalogContent> beforeCatalog,
        [Description("Catálogo 'depois' — saída de generate_optimized_content para os mesmos produtos do catálogo 'antes' (mesmos handles).")]
        IReadOnlyList<ProductCatalogContent> afterCatalog,
        [Description("Classificação esperada por handle de produto, conforme o spec do catálogo de teste (quem devia passar e quem devia ser rejeitado) — usada para computar a taxa de sucesso por classificação correta. Produtos sem entrada aqui ficam fora do denominador da taxa de sucesso, mas continuam aparecendo na comparação.")]
        IReadOnlyList<ExpectedProductOutcome>? expectedOutcomes,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(naturalLanguageOrder))
        {
            throw new McpException("O pedido em linguagem natural não pode ser vazio.");
        }

        ArgumentNullException.ThrowIfNull(beforeCatalog);
        ArgumentNullException.ThrowIfNull(afterCatalog);
        if (beforeCatalog.Count == 0 || afterCatalog.Count == 0)
        {
            throw new McpException("Os catálogos 'antes' e 'depois' não podem estar vazios.");
        }

        var requirements = await BuyerAgentSimulatorTools.ExtractRequirementsAsync(
            aiGatewayClient, aiGatewayOptions, naturalLanguageOrder, cancellationToken);

        return BuildComparison(naturalLanguageOrder, requirements, beforeCatalog, afterCatalog, expectedOutcomes);
    }

    // Separated from the AI Gateway call above so it's directly unit-testable with a
    // fixed BuyerOrderRequirements — no HTTP, same pattern BuyerAgentSimulatorToolsTests
    // already uses to test ToCandidateProduct/BuyerAgentDecisionEngine.Simulate without
    // exercising the extraction call.
    internal static BeforeAfterComparisonResult BuildComparison(
        string naturalLanguageOrder,
        BuyerOrderRequirements requirements,
        IReadOnlyList<ProductCatalogContent> beforeCatalog,
        IReadOnlyList<ProductCatalogContent> afterCatalog,
        IReadOnlyList<ExpectedProductOutcome>? expectedOutcomes)
    {
        var beforeHandles = beforeCatalog.Select(p => p.Handle).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var afterHandles = afterCatalog.Select(p => p.Handle).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missingInAfter = beforeHandles.Where(h => !afterHandles.Contains(h)).ToList();
        if (missingInAfter.Count > 0)
        {
            throw new McpException(
                "Os catálogos 'antes' e 'depois' precisam ter os mesmos produtos (por handle) — " +
                $"faltando no 'depois': {string.Join(", ", missingInAfter)}.");
        }

        var beforeResult = BuyerAgentDecisionEngine.Simulate(
            requirements, [.. beforeCatalog.Select(BuyerAgentSimulatorTools.ToCandidateProduct)]);
        var afterResult = BuyerAgentDecisionEngine.Simulate(
            requirements, [.. afterCatalog.Select(BuyerAgentSimulatorTools.ToCandidateProduct)]);

        var beforeOutcomeByHandle = IndexByHandle(beforeCatalog, beforeResult);
        var afterOutcomeByHandle = IndexByHandle(afterCatalog, afterResult);
        var expectedByHandle = (expectedOutcomes ?? [])
            .ToDictionary(e => e.ProductHandle, e => e.ShouldPass, StringComparer.OrdinalIgnoreCase);

        var products = beforeCatalog
            .Select(product =>
            {
                var handle = product.Handle;
                var before = beforeOutcomeByHandle[handle];
                var after = afterOutcomeByHandle[handle];
                var hasExpectation = expectedByHandle.TryGetValue(handle, out var shouldPass);

                return new BeforeAfterProductComparison(
                    before.Product.ProductId,
                    handle,
                    before.Product.Title,
                    hasExpectation ? shouldPass : null,
                    before.Passed,
                    after.Passed,
                    hasExpectation ? shouldPass == before.Passed : null,
                    hasExpectation ? shouldPass == after.Passed : null,
                    before.ConfirmedRequirements,
                    before.UnmetRequirements,
                    after.ConfirmedRequirements,
                    after.UnmetRequirements);
            })
            .ToList();

        var beforeSummary = Summarize(products.Select(p => p.CorrectlyClassifiedBefore), beforeResult);
        var afterSummary = Summarize(products.Select(p => p.CorrectlyClassifiedAfter), afterResult);

        return new BeforeAfterComparisonResult(
            naturalLanguageOrder,
            requirements.AttributeRequirements,
            requirements.NumericMinimumRequirementsOrEmpty,
            requirements.MaxPrice,
            products,
            beforeSummary,
            afterSummary,
            afterSummary.CorrectlyClassifiedCount - beforeSummary.CorrectlyClassifiedCount,
            afterSummary.SuccessRate - beforeSummary.SuccessRate);
    }

    private static Dictionary<string, BuyerFilterOutcome> IndexByHandle(
        IReadOnlyList<ProductCatalogContent> catalog, BuyerAgentSimulationResult result)
    {
        var handleByProductId = catalog.ToDictionary(p => p.Id, p => p.Handle);
        return result.FilterOutcomes.ToDictionary(
            o => handleByProductId[o.Product.ProductId], StringComparer.OrdinalIgnoreCase);
    }

    // Only products with an expectedOutcomes entry count toward the success rate's
    // denominator — a product nobody made a prediction for can't be "correctly" or
    // "incorrectly" classified.
    private static BeforeAfterRoundSummary Summarize(
        IEnumerable<bool?> correctlyClassifiedFlags, BuyerAgentSimulationResult result)
    {
        var evaluated = correctlyClassifiedFlags.Where(f => f is not null).Select(f => f!.Value).ToList();
        var correctCount = evaluated.Count(f => f);
        var total = evaluated.Count;

        return new BeforeAfterRoundSummary(
            correctCount,
            total,
            total == 0 ? 0 : (double)correctCount / total,
            result.ChosenProduct?.Title,
            result.Justification);
    }
}

/// <summary>Classificação que o spec do catálogo de teste prevê para um produto num
/// pedido específico — a "resposta certa" contra a qual a taxa de sucesso é medida
/// (ver definição em <c>.scratch/entrega-hackathon/issues/04-rodadas-antes-depois.md</c>:
/// "passou quem devia passar, e rejeitou quem devia rejeitar"). Vem do caller, não é
/// hardcoded aqui — o mesmo engine serve para qualquer catálogo/pedido de teste.</summary>
public sealed record ExpectedProductOutcome(string ProductHandle, bool ShouldPass);

/// <summary>Comparação de um produto entre as duas rodadas: o que passou/faltou em
/// cada uma, e — quando há expectativa registrada para o handle — se a classificação
/// (passou/rejeitou) bateu com o que o spec previa.</summary>
public sealed record BeforeAfterProductComparison(
    string ProductId,
    string Handle,
    string Title,
    bool? ExpectedToPass,
    bool PassedBefore,
    bool PassedAfter,
    bool? CorrectlyClassifiedBefore,
    bool? CorrectlyClassifiedAfter,
    IReadOnlyList<string> ConfirmedRequirementsBefore,
    IReadOnlyList<UnmetRequirement> UnmetRequirementsBefore,
    IReadOnlyList<string> ConfirmedRequirementsAfter,
    IReadOnlyList<UnmetRequirement> UnmetRequirementsAfter);

/// <summary>Resumo de uma rodada: quantos produtos (dentre os que tinham expectativa
/// registrada) foram classificados corretamente, a taxa resultante, e o vencedor da
/// etapa 2 (desempate) com sua justificativa.</summary>
public sealed record BeforeAfterRoundSummary(
    int CorrectlyClassifiedCount,
    int TotalClassifiedProducts,
    double SuccessRate,
    string? ChosenProductTitle,
    string Justification);

/// <summary>Saída de <c>compare_buyer_agent_rounds</c> — o "número" do ticket 04: a
/// comparação estruturada por produto e o delta de taxa de sucesso entre as duas
/// rodadas, pronta para a view do ticket 14 renderizar sem nenhuma chamada de rede.</summary>
public sealed record BeforeAfterComparisonResult(
    string NaturalLanguageOrder,
    IReadOnlyList<BuyerAttributeRequirement> AttributeRequirements,
    IReadOnlyList<BuyerNumericMinimumRequirement> NumericMinimumRequirements,
    decimal? MaxPrice,
    IReadOnlyList<BeforeAfterProductComparison> Products,
    BeforeAfterRoundSummary Before,
    BeforeAfterRoundSummary After,
    int SuccessRateDeltaCount,
    double SuccessRateDelta);
