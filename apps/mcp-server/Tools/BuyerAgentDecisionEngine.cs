using System.Globalization;

namespace McpServer.Tools;

/// <summary>
/// Pure implementation of the two-step generic buyer-agent mechanic (see
/// docs/ideia-central-geo-validacao.md §4.1): strict requirement filtering
/// (etapa 1), then differentiator/secondary-signal tie-break among the
/// remaining candidates (etapa 2). No AI Gateway call and no per-product-category
/// logic — every requirement, attribute and signal name is data supplied by the
/// caller, not code, so the same engine works for any catalog or product type.
/// <see cref="BuyerAgentSimulatorTools"/> is the only caller that talks to the AI
/// Gateway (to turn a natural-language order into <see cref="BuyerOrderRequirements"/>);
/// this class has no network dependency and is exercised directly by
/// McpServer.Tests with already-extracted requirements.
/// </summary>
public static class BuyerAgentDecisionEngine
{
    public static BuyerAgentSimulationResult Simulate(
        BuyerOrderRequirements requirements,
        IReadOnlyList<BuyerCandidateProduct> catalog)
    {
        ArgumentNullException.ThrowIfNull(requirements);
        ArgumentNullException.ThrowIfNull(catalog);

        var filterOutcomes = catalog.Select(product => EvaluateProduct(product, requirements)).ToList();
        var passedCandidates = filterOutcomes.Where(o => o.Passed).Select(o => o.Product).ToList();
        var (chosenProduct, justification) = ChooseCandidate(passedCandidates);

        return new BuyerAgentSimulationResult(filterOutcomes, passedCandidates, chosenProduct, justification);
    }

    // Etapa 1: aplica cada requisito à risca — sem dado estruturado que confirme o
    // requisito, o produto é descartado mesmo que atenda na prática (é exatamente o
    // efeito de falta de legibilidade agêntica que a mecânica quer expor).
    private static BuyerFilterOutcome EvaluateProduct(BuyerCandidateProduct product, BuyerOrderRequirements requirements)
    {
        var unmetRequirements = new List<string>();

        foreach (var requirement in requirements.AttributeRequirements)
        {
            var match = product.StructuredAttributes.FirstOrDefault(attribute =>
                string.Equals(attribute.Key, requirement.AttributeName, StringComparison.OrdinalIgnoreCase));

            if (match.Key is null)
            {
                unmetRequirements.Add($"Sem dado estruturado para confirmar '{requirement.AttributeName}'.");
                continue;
            }

            if (!match.Value.Contains(requirement.ExpectedValue, StringComparison.OrdinalIgnoreCase))
            {
                unmetRequirements.Add(
                    $"'{requirement.AttributeName}' = '{match.Value}' não confirma '{requirement.ExpectedValue}'.");
            }
        }

        if (requirements.MaxPrice is { } maxPrice)
        {
            if (product.Price is not { } price)
            {
                unmetRequirements.Add(
                    $"Sem preço estruturado para confirmar o limite de {maxPrice.ToString("C", CultureInfo.InvariantCulture)}.");
            }
            else if (price > maxPrice)
            {
                unmetRequirements.Add(
                    $"Preço {price.ToString("C", CultureInfo.InvariantCulture)} acima do limite de {maxPrice.ToString("C", CultureInfo.InvariantCulture)}.");
            }
        }

        return new BuyerFilterOutcome(product, unmetRequirements.Count == 0, unmetRequirements);
    }

    // Etapa 2: compara os candidatos remanescentes por sinais secundários genéricos
    // (nome + valor + direção informados pelo caller — nunca hardcoded aqui). Um
    // candidato "vence" um sinal quando é o único líder isolado nesse sinal entre os
    // candidatos que o carregam; o vencedor geral é quem acumula mais sinais vencidos.
    private static (BuyerCandidateProduct? Chosen, string Justification) ChooseCandidate(
        IReadOnlyList<BuyerCandidateProduct> candidates)
    {
        if (candidates.Count == 0)
        {
            return (null, "Nenhum produto do catálogo confirmou todos os requisitos obrigatórios com dado estruturado.");
        }

        if (candidates.Count == 1)
        {
            var only = candidates[0];
            return (only, $"Único candidato ('{only.Title}') que confirmou todos os requisitos obrigatórios com dado estruturado.");
        }

        var winReasonsByProductId = candidates.ToDictionary(c => c.ProductId, _ => new List<string>());

        var signalNames = candidates
            .SelectMany(c => c.SecondarySignals.Select(s => s.Name))
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var signalName in signalNames)
        {
            var withSignal = candidates
                .Select(c => (Product: c, Signal: c.SecondarySignals.FirstOrDefault(s =>
                    string.Equals(s.Name, signalName, StringComparison.OrdinalIgnoreCase))))
                .Where(x => x.Signal is not null)
                .Select(x => (x.Product, Signal: x.Signal!))
                .ToList();

            if (withSignal.Count < 2)
            {
                // Only one candidate carries this signal — not a basis for comparison.
                continue;
            }

            var bestValue = withSignal[0].Signal.Direction == BuyerSignalDirection.HigherIsBetter
                ? withSignal.Max(x => x.Signal.Value)
                : withSignal.Min(x => x.Signal.Value);

            var leaders = withSignal.Where(x => x.Signal.Value == bestValue).ToList();
            if (leaders.Count != 1)
            {
                // Tied on this signal across candidates that carry it — not decisive.
                continue;
            }

            var winningValue = leaders[0].Signal.Value.ToString("0.##", CultureInfo.InvariantCulture);
            winReasonsByProductId[leaders[0].Product.ProductId].Add($"{signalName} ({winningValue})");
        }

        var winnerEntry = winReasonsByProductId
            .OrderByDescending(kv => kv.Value.Count)
            .ThenBy(kv => kv.Key, StringComparer.Ordinal)
            .First();

        var winnerProduct = candidates.First(c => c.ProductId == winnerEntry.Key);

        if (winnerEntry.Value.Count == 0)
        {
            var fallback = candidates.OrderBy(c => c.ProductId, StringComparer.Ordinal).First();
            return (fallback,
                $"'{fallback.Title}' escolhido entre {candidates.Count} candidatos empatados nos requisitos obrigatórios " +
                "— sem sinais secundários estruturados suficientes para desempatar por diferencial.");
        }

        return (winnerProduct,
            $"'{winnerProduct.Title}' escolhido entre {candidates.Count} candidatos por se destacar em: " +
            $"{string.Join(", ", winnerEntry.Value)}.");
    }
}

/// <summary>One requisito obrigatório extraído do pedido: nome do atributo estruturado
/// que precisa confirmá-lo (ex: "Cancelamento de ruído", "Tipo de produto") e o valor
/// esperado. A confirmação é por substring case-insensitive contra o dado estruturado
/// do produto — não por igualdade exata, para tolerar variação de fraseado do LLM de
/// extração sem abrir mão do "aplicado à risca" (ainda exige que o dado exista).</summary>
public sealed record BuyerAttributeRequirement(string AttributeName, string ExpectedValue);

/// <summary>Requisitos obrigatórios extraídos de um pedido em linguagem natural
/// (etapa 1 da mecânica). <see cref="MaxPrice"/> é tratado à parte por ser uma
/// restrição numérica (limite), não uma confirmação de valor exato.</summary>
public sealed record BuyerOrderRequirements(
    IReadOnlyList<BuyerAttributeRequirement> AttributeRequirements,
    decimal? MaxPrice = null);

public enum BuyerSignalDirection
{
    HigherIsBetter,
    LowerIsBetter,
}

/// <summary>Um sinal secundário genérico usado no desempate da etapa 2 (ex: avaliação,
/// mais vendido, prazo de entrega, política de devolução) — nome, valor numérico e
/// direção ("maior é melhor" ou "menor é melhor") são todos dados de entrada; o
/// engine não conhece nenhum nome de sinal específico.</summary>
public sealed record BuyerSecondarySignal(string Name, double Value, BuyerSignalDirection Direction);

/// <summary>Um produto candidato como o engine puro o enxerga: preço e dado
/// estruturado genérico (nome → valor), sem nenhuma noção de categoria de produto.
/// <see cref="BuyerAgentSimulatorTools"/> é quem monta isso a partir do
/// <c>ProductCatalogContent</c> lido da Shopify (ticket 04).</summary>
public sealed record BuyerCandidateProduct(
    string ProductId,
    string Title,
    decimal? Price,
    IReadOnlyDictionary<string, string> StructuredAttributes,
    IReadOnlyList<BuyerSecondarySignal> SecondarySignals);

/// <summary>Resultado da avaliação de um produto na etapa 1: se passou e, quando não
/// passou, a lista de requisitos que não puderam ser confirmados — serve tanto para a
/// tool devolver transparência ao caller quanto para depurar testes.</summary>
public sealed record BuyerFilterOutcome(
    BuyerCandidateProduct Product,
    bool Passed,
    IReadOnlyList<string> UnmetRequirements);

/// <summary>Saída completa da simulação: todos os produtos avaliados (com motivo de
/// descarte quando aplicável), os que passaram na filtragem, o escolhido (nulo se
/// nenhum passou) e a justificativa da escolha.</summary>
public sealed record BuyerAgentSimulationResult(
    IReadOnlyList<BuyerFilterOutcome> FilterOutcomes,
    IReadOnlyList<BuyerCandidateProduct> PassedCandidates,
    BuyerCandidateProduct? ChosenProduct,
    string Justification);
