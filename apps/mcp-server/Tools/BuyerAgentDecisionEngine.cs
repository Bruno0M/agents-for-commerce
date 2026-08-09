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
        var confirmedRequirements = new List<string>();
        var unmetRequirements = new List<UnmetRequirement>();

        foreach (var requirement in requirements.AttributeRequirements)
        {
            var match = FindMatchingAttribute(product.StructuredAttributes, requirement.AttributeName);

            if (match.Key is null)
            {
                unmetRequirements.Add(new UnmetRequirement(
                    $"Sem dado estruturado para confirmar '{requirement.AttributeName}'.",
                    UnmetRequirementKind.Illegibility));
                continue;
            }

            if (!ValueConfirms(match.Value, requirement.ExpectedValue))
            {
                unmetRequirements.Add(new UnmetRequirement(
                    $"'{requirement.AttributeName}' = '{match.Value}' não confirma '{requirement.ExpectedValue}'.",
                    UnmetRequirementKind.LegitimateRejection));
                continue;
            }

            confirmedRequirements.Add($"'{requirement.AttributeName}' = '{match.Value}'.");
        }

        foreach (var numericRequirement in requirements.NumericMinimumRequirementsOrEmpty)
        {
            var unit = numericRequirement.Unit ?? string.Empty;
            var minLabel = $"{numericRequirement.MinValue.ToString(CultureInfo.InvariantCulture)}{unit}";
            var match = FindMatchingAttribute(product.StructuredAttributes, numericRequirement.AttributeName);

            if (match.Key is null)
            {
                unmetRequirements.Add(new UnmetRequirement(
                    $"Sem dado estruturado para confirmar '{numericRequirement.AttributeName}' (mínimo {minLabel}).",
                    UnmetRequirementKind.Illegibility));
                continue;
            }

            var extractedValue = ExtractLeadingNumber(match.Value);
            if (extractedValue is not { } numericValue)
            {
                unmetRequirements.Add(new UnmetRequirement(
                    $"'{numericRequirement.AttributeName}' = '{match.Value}' não tem valor numérico reconhecível para confirmar o mínimo de {minLabel}.",
                    UnmetRequirementKind.Illegibility));
                continue;
            }

            if (numericValue < numericRequirement.MinValue)
            {
                unmetRequirements.Add(new UnmetRequirement(
                    $"'{numericRequirement.AttributeName}' = '{numericValue.ToString(CultureInfo.InvariantCulture)}{unit}' abaixo do mínimo de {minLabel}.",
                    UnmetRequirementKind.LegitimateRejection));
                continue;
            }

            confirmedRequirements.Add(
                $"'{numericRequirement.AttributeName}' = '{numericValue.ToString(CultureInfo.InvariantCulture)}{unit}' (mínimo {minLabel}).");
        }

        if (requirements.MaxPrice is { } maxPrice)
        {
            if (product.Price is not { } price)
            {
                unmetRequirements.Add(new UnmetRequirement(
                    $"Sem preço estruturado para confirmar o limite de {maxPrice.ToString("C", CultureInfo.InvariantCulture)}.",
                    UnmetRequirementKind.Illegibility));
            }
            else if (price > maxPrice)
            {
                unmetRequirements.Add(new UnmetRequirement(
                    $"Preço {price.ToString("C", CultureInfo.InvariantCulture)} acima do limite de {maxPrice.ToString("C", CultureInfo.InvariantCulture)}.",
                    UnmetRequirementKind.LegitimateRejection));
            }
            else
            {
                confirmedRequirements.Add(
                    $"Preço {price.ToString("C", CultureInfo.InvariantCulture)} dentro do limite de {maxPrice.ToString("C", CultureInfo.InvariantCulture)}.");
            }
        }

        return new BuyerFilterOutcome(product, unmetRequirements.Count == 0, confirmedRequirements, unmetRequirements);
    }

    // Plain substring Contains has a real false-positive: a spec value that factually
    // *denies* the requirement can still contain the expected word literally — the demo
    // catalog's own control product states "Não possui cancelamento de ruído ativo" (a
    // deliberate, justified negative per .scratch/catalogo-demo/spec.md), and that value
    // contains the literal substring "ativo". Confirmed live: this made a control pass
    // the "depois" round it must fail. Scope the check to the clause that contains the
    // match (split on . ; , :) and reject if a negation marker appears in that same
    // clause — a product-agnostic, no-AI heuristic; it does not attempt full negation
    // scope resolution beyond clause boundaries.
    private static bool ValueConfirms(string actualValue, string expectedValue)
    {
        var matchIndex = actualValue.IndexOf(expectedValue, StringComparison.OrdinalIgnoreCase);
        if (matchIndex < 0)
        {
            return false;
        }

        var clauseStart = 0;
        for (var i = matchIndex - 1; i >= 0; i--)
        {
            if (actualValue[i] is '.' or ';' or ',' or ':')
            {
                clauseStart = i + 1;
                break;
            }
        }

        var clause = actualValue[clauseStart..];
        return !NegationMarkers.Any(marker => clause.Contains(marker, StringComparison.OrdinalIgnoreCase));
    }

    private static readonly string[] NegationMarkers = ["não", "nao", "nunca", "nenhum", "nenhuma", "sem "];

    // Requirement extraction (from the order) and property extraction (from the
    // description, in generate_optimized_content) are two independent LLM calls —
    // ticket 03's comments flagged this as a structural risk ("Duração da bateria"
    // vs "Autonomia da bateria" is a real example a live run produced), and ticket 04
    // hit it on pedido A itself. An exact-key match stays the fast, precise path;
    // the fallback only fires when it misses, and only requires the two names to
    // share one significant (non-stopword, >2-char) word — enough to bridge synonym
    // drift on a single well-known concept without turning into free-text search.
    // Known limitation (left for ticket 18 to revisit if it bites): with several
    // distinct attributes sharing a word (e.g. two different "bateria" specs), this
    // picks whichever the dictionary enumerates first.
    private static KeyValuePair<string, string> FindMatchingAttribute(
        IReadOnlyDictionary<string, string> attributes, string requirementName)
    {
        var exact = attributes.FirstOrDefault(attribute =>
            string.Equals(attribute.Key, requirementName, StringComparison.OrdinalIgnoreCase));
        if (exact.Key is not null)
        {
            return exact;
        }

        var requirementWords = SignificantWords(requirementName);
        if (requirementWords.Count == 0)
        {
            return default;
        }

        return attributes.FirstOrDefault(attribute => SignificantWords(attribute.Key).Overlaps(requirementWords));
    }

    private static readonly HashSet<string> PortugueseStopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "com", "para", "em", "no", "na",
    };

    private static HashSet<string> SignificantWords(string text) => new(
        text.Split([' ', '-', '/'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(word => word.Length > 2 && !PortugueseStopWords.Contains(word)),
        StringComparer.OrdinalIgnoreCase);

    // Buyer-facing spec values are prose ("Até 28 horas com o estojo de recarga"),
    // not bare numbers — pulls the first decimal/integer out to compare against a
    // BuyerNumericMinimumRequirement. Only the leading number is used by design: a
    // spec sentence leads with the number that matters (see the demo catalog's own
    // convention in .scratch/catalogo-demo/spec.md), and picking a single
    // unambiguous number is safer than trying to guess among several.
    private static decimal? ExtractLeadingNumber(string value)
    {
        var match = System.Text.RegularExpressions.Regex.Match(value, @"\d+(?:[.,]\d+)?");
        if (!match.Success)
        {
            return null;
        }

        return decimal.TryParse(
            match.Value.Replace(",", ".", StringComparison.Ordinal),
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out var result)
            ? result
            : null;
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

/// <summary>Um requisito de mínimo numérico extraído do pedido (ex: "pelo menos 20
/// horas de bateria") — tratado à parte de <see cref="BuyerAttributeRequirement"/>
/// porque uma comparação "≥" não pode ser expressa como confirmação de substring: o
/// valor estruturado do produto é prosa ("Até 28 horas com o estojo"), não um número
/// isolado, e a exigência é sobre a grandeza, não sobre casar o texto do pedido.
/// <see cref="Unit"/> é só para exibição (ex: "h") — a comparação em si é numérica.</summary>
public sealed record BuyerNumericMinimumRequirement(string AttributeName, decimal MinValue, string? Unit = null);

/// <summary>Requisitos obrigatórios extraídos de um pedido em linguagem natural
/// (etapa 1 da mecânica). <see cref="MaxPrice"/> e <see cref="NumericMinimumRequirements"/>
/// são tratados à parte por serem restrições numéricas (limite/mínimo), não
/// confirmação de valor exato.</summary>
public sealed record BuyerOrderRequirements(
    IReadOnlyList<BuyerAttributeRequirement> AttributeRequirements,
    decimal? MaxPrice = null,
    IReadOnlyList<BuyerNumericMinimumRequirement>? NumericMinimumRequirements = null)
{
    public IReadOnlyList<BuyerNumericMinimumRequirement> NumericMinimumRequirementsOrEmpty =>
        NumericMinimumRequirements ?? [];
}

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

/// <summary>Resultado da avaliação de um produto na etapa 1: se passou, os requisitos
/// que o dado estruturado confirmou e, quando não passou, a lista dos que não puderam
/// ser confirmados — serve tanto para a tool devolver transparência ao caller (é a
/// base do "confirmado vs. faltante" da comparação antes/depois, ticket 04) quanto
/// para depurar testes.</summary>
public sealed record BuyerFilterOutcome(
    BuyerCandidateProduct Product,
    bool Passed,
    IReadOnlyList<string> ConfirmedRequirements,
    IReadOnlyList<UnmetRequirement> UnmetRequirements);

/// <summary>A natureza de um <see cref="UnmetRequirement"/>: <see cref="Illegibility"/>
/// quando o agente não teve dado estruturado (ou dado numericamente reconhecível) para
/// sequer avaliar o requisito, <see cref="LegitimateRejection"/> quando ele avaliou e o
/// dado estruturado contraria o requisito. Ticket 02 (D3 da spec do exame guiado): essa
/// distinção é a métrica de topo ("produtos que o agente não conseguiu sequer avaliar")
/// porque, ao contrário da taxa de sucesso por classificação correta, ela não depende de
/// um gabarito — é um fato sobre a loja, não sobre o pedido.</summary>
public enum UnmetRequirementKind
{
    Illegibility,
    LegitimateRejection,
}

/// <summary>Um requisito não atendido: a frase legível para humano/UI e a natureza do
/// motivo, emparelhadas no exato ponto de <see cref="BuyerAgentDecisionEngine"/> onde o
/// motivo é produzido. A natureza nasce aqui — deliberadamente não é derivada depois por
/// parsing de <see cref="Message"/> em nenhuma camada acima (tool, UI): isso é o que o
/// ticket 02 existe para proibir, porque ficaria errado no primeiro ajuste de
/// fraseado.</summary>
public sealed record UnmetRequirement(string Message, UnmetRequirementKind Kind);

/// <summary>Saída completa da simulação: todos os produtos avaliados (com motivo de
/// descarte quando aplicável), os que passaram na filtragem, o escolhido (nulo se
/// nenhum passou) e a justificativa da escolha.</summary>
public sealed record BuyerAgentSimulationResult(
    IReadOnlyList<BuyerFilterOutcome> FilterOutcomes,
    IReadOnlyList<BuyerCandidateProduct> PassedCandidates,
    BuyerCandidateProduct? ChosenProduct,
    string Justification);
