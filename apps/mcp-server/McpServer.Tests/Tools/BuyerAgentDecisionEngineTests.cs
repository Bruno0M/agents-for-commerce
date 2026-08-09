using McpServer.Tools;

namespace McpServer.Tests.Tools;

public class BuyerAgentDecisionEngineTests
{
    private static BuyerCandidateProduct Product(
        string id,
        string title,
        decimal? price = null,
        Dictionary<string, string>? attributes = null,
        List<BuyerSecondarySignal>? signals = null) =>
        new(id, title, price, attributes ?? [], signals ?? []);

    [Fact]
    public void Simulate_ProductWithoutStructuredDataForRequirement_IsDiscarded()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var product = Product("1", "Fone sem specs", attributes: []);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Empty(result.PassedCandidates);
        Assert.Null(result.ChosenProduct);
        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.False(outcome.Passed);
        Assert.Contains(outcome.UnmetRequirements, r => r.Message.Contains("Cancelamento de ruído"));
    }

    [Fact]
    public void Simulate_StructuredAttributePresentButDoesNotConfirmValue_IsDiscarded()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var product = Product("1", "Fone sem ANC", attributes: new()
        {
            ["Cancelamento de ruído"] = "passivo",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Empty(result.PassedCandidates);
        Assert.Null(result.ChosenProduct);
    }

    [Fact]
    public void Simulate_PriceAboveMaxPrice_IsDiscarded()
    {
        var requirements = new BuyerOrderRequirements([], MaxPrice: 300m);

        var product = Product("1", "Fone caro", price: 350m);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Empty(result.PassedCandidates);
        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.Contains(outcome.UnmetRequirements, r => r.Message.Contains("acima do limite"));
    }

    [Fact]
    public void Simulate_MissingPriceWhenMaxPriceRequired_IsDiscarded()
    {
        var requirements = new BuyerOrderRequirements([], MaxPrice: 300m);

        var product = Product("1", "Fone sem preço estruturado", price: null);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Empty(result.PassedCandidates);
        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.Contains(outcome.UnmetRequirements, r => r.Message.Contains("Sem preço estruturado"));
    }

    [Fact]
    public void Simulate_ProductConfirmingAllRequirements_RemainsCandidateAndIsChosen()
    {
        var requirements = new BuyerOrderRequirements(
            [
                new BuyerAttributeRequirement("Tipo de produto", "fone bluetooth"),
                new BuyerAttributeRequirement("Cancelamento de ruído", "ativo"),
            ],
            MaxPrice: 300m);

        var product = Product("1", "Fone XPTO", price: 279m, attributes: new()
        {
            ["Tipo de produto"] = "Fone bluetooth over-ear",
            ["Cancelamento de ruído"] = "Ativo (híbrido)",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Single(result.PassedCandidates);
        Assert.Equal(product, result.ChosenProduct);
        Assert.Contains("Único candidato", result.Justification);
    }

    [Fact]
    public void Simulate_TwoCandidatesRemaining_TieBreaksByHigherIsBetterSignal()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var attributes = new Dictionary<string, string> { ["Cancelamento de ruído"] = "ativo" };

        var betterRated = Product("A", "Fone Melhor Avaliado", attributes: attributes, signals:
        [
            new BuyerSecondarySignal("Avaliação", 4.8, BuyerSignalDirection.HigherIsBetter),
        ]);
        var worseRated = Product("B", "Fone Pior Avaliado", attributes: attributes, signals:
        [
            new BuyerSecondarySignal("Avaliação", 3.9, BuyerSignalDirection.HigherIsBetter),
        ]);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [worseRated, betterRated]);

        Assert.Equal(2, result.PassedCandidates.Count);
        Assert.Equal(betterRated, result.ChosenProduct);
        Assert.Contains("Avaliação", result.Justification);
    }

    [Fact]
    public void Simulate_TwoCandidatesRemaining_TieBreaksByLowerIsBetterSignal()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Tipo de pisada", "neutra")]);

        var attributes = new Dictionary<string, string> { ["Tipo de pisada"] = "neutra" };

        var fastDelivery = Product("A", "Tênis com entrega rápida", attributes: attributes, signals:
        [
            new BuyerSecondarySignal("Prazo de entrega (dias)", 2, BuyerSignalDirection.LowerIsBetter),
        ]);
        var slowDelivery = Product("B", "Tênis com entrega lenta", attributes: attributes, signals:
        [
            new BuyerSecondarySignal("Prazo de entrega (dias)", 10, BuyerSignalDirection.LowerIsBetter),
        ]);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [slowDelivery, fastDelivery]);

        Assert.Equal(fastDelivery, result.ChosenProduct);
        Assert.Contains("Prazo de entrega", result.Justification);
    }

    [Fact]
    public void Simulate_TwoCandidatesRemaining_MultipleSignals_ChoosesTheOneWithMoreWins()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var attributes = new Dictionary<string, string> { ["Cancelamento de ruído"] = "ativo" };

        // A wins on rating and best-seller rank; B only wins on delivery speed —
        // A should accumulate more signal wins and be chosen.
        var candidateA = Product("A", "Fone A", attributes: attributes, signals:
        [
            new BuyerSecondarySignal("Avaliação", 4.9, BuyerSignalDirection.HigherIsBetter),
            new BuyerSecondarySignal("Ranking mais vendido", 1, BuyerSignalDirection.LowerIsBetter),
            new BuyerSecondarySignal("Prazo de entrega (dias)", 7, BuyerSignalDirection.LowerIsBetter),
        ]);
        var candidateB = Product("B", "Fone B", attributes: attributes, signals:
        [
            new BuyerSecondarySignal("Avaliação", 4.2, BuyerSignalDirection.HigherIsBetter),
            new BuyerSecondarySignal("Ranking mais vendido", 5, BuyerSignalDirection.LowerIsBetter),
            new BuyerSecondarySignal("Prazo de entrega (dias)", 2, BuyerSignalDirection.LowerIsBetter),
        ]);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [candidateA, candidateB]);

        Assert.Equal(candidateA, result.ChosenProduct);
    }

    [Fact]
    public void Simulate_TwoCandidatesRemaining_NoSecondarySignals_FallsBackDeterministicallyWithClearJustification()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var attributes = new Dictionary<string, string> { ["Cancelamento de ruído"] = "ativo" };

        var productB = Product("B", "Fone B", attributes: attributes);
        var productA = Product("A", "Fone A", attributes: attributes);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [productB, productA]);

        Assert.Equal(2, result.PassedCandidates.Count);
        Assert.Equal(productA, result.ChosenProduct);
        Assert.Contains("sem sinais secundários estruturados suficientes", result.Justification);
    }

    [Fact]
    public void Simulate_NoProductPassesFiltering_ReturnsNullChosenWithJustification()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Impermeável", "sim")]);

        var products = new[]
        {
            Product("1", "Produto sem specs"),
            Product("2", "Produto com spec errada", attributes: new() { ["Impermeável"] = "não" }),
        };

        var result = BuyerAgentDecisionEngine.Simulate(requirements, products);

        Assert.Empty(result.PassedCandidates);
        Assert.Null(result.ChosenProduct);
        Assert.Equal(2, result.FilterOutcomes.Count);
        Assert.All(result.FilterOutcomes, o => Assert.False(o.Passed));
    }

    [Fact]
    public void Simulate_AttributeValueNegatesRequirementInSameClause_IsDiscardedDespiteLiteralSubstringMatch()
    {
        // Real bug hit on the demo catalog's own control product (Corvo Sport 2, ticket
        // 04): the generated description-derived value is "Não possui cancelamento de
        // ruído ativo" — plain Contains("ativo") would wrongly confirm this.
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var product = Product("1", "Fone sem ANC", attributes: new()
        {
            ["Cancelamento de ruído"] = "Não possui cancelamento de ruído ativo",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Empty(result.PassedCandidates);
        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.False(outcome.Passed);
        Assert.Contains(outcome.UnmetRequirements, r => r.Message.Contains("Cancelamento de ruído"));
    }

    [Fact]
    public void Simulate_NegationInAnEarlierClauseDoesNotBlockAConfirmationInALaterClause()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var product = Product("1", "Fone com ANC e sem resistência à água", attributes: new()
        {
            ["Cancelamento de ruído"] = "Sem bateria fraca aqui; cancelamento de ruído ativo com três níveis",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Single(result.PassedCandidates);
    }

    [Fact]
    public void Simulate_NumericMinimumBelowThreshold_IsDiscardedWithReasonShowingBothNumbers()
    {
        var requirements = new BuyerOrderRequirements(
            [],
            NumericMinimumRequirements: [new BuyerNumericMinimumRequirement("Autonomia da bateria", 20m, "h")]);

        var product = Product("1", "Fone 14h", attributes: new()
        {
            ["Autonomia da bateria"] = "14 horas",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Empty(result.PassedCandidates);
        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.False(outcome.Passed);
        Assert.Contains(outcome.UnmetRequirements, r => r.Message.Contains("14") && r.Message.Contains("abaixo do mínimo"));
    }

    [Fact]
    public void Simulate_NumericMinimumAtOrAboveThreshold_IsConfirmed()
    {
        var requirements = new BuyerOrderRequirements(
            [],
            NumericMinimumRequirements: [new BuyerNumericMinimumRequirement("Autonomia da bateria", 20m, "h")]);

        var product = Product("1", "Fone 28h", attributes: new()
        {
            ["Autonomia da bateria"] = "Até 28 horas com o estojo de recarga",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Single(result.PassedCandidates);
        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.Contains(outcome.ConfirmedRequirements, r => r.Contains("28"));
    }

    [Fact]
    public void Simulate_RequirementNameDiffersFromAttributeKeyBySynonym_StillMatchesViaSharedSignificantWord()
    {
        // Real risk flagged in ticket 03's comments and confirmed live on ticket 04's
        // pedido A: the order's requirement extraction and generate_optimized_content's
        // property extraction are independent LLM calls that can name the same concept
        // differently ("Duração da bateria" vs "Autonomia da bateria").
        var requirements = new BuyerOrderRequirements(
            [],
            NumericMinimumRequirements: [new BuyerNumericMinimumRequirement("Duração da bateria", 20m, "h")]);

        var product = Product("1", "Fone 28h", attributes: new()
        {
            ["Autonomia da bateria"] = "28 horas",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Single(result.PassedCandidates);
    }

    [Fact]
    public void Simulate_GenericEngineWorksForUnrelatedProductDomainsWithoutCategorySpecificCode()
    {
        // Same engine, no code change — proves the mechanic is catalog-agnostic
        // (see docs/ideia-central-geo-validacao.md §4.1) by running it against a
        // completely different product domain (running shoes vs. headphones).
        var requirements = new BuyerOrderRequirements(
            [
                new BuyerAttributeRequirement("Tipo de pisada", "pronada"),
                new BuyerAttributeRequirement("Política de devolução", "gratuita"),
            ],
            MaxPrice: 500m);

        var matchingShoe = Product("1", "Tênis Corrida X", price: 459m, attributes: new()
        {
            ["Tipo de pisada"] = "Indicado para pisada pronada",
            ["Política de devolução"] = "Devolução gratuita em até 30 dias",
        });
        var wrongPronation = Product("2", "Tênis Corrida Y", price: 399m, attributes: new()
        {
            ["Tipo de pisada"] = "Indicado para pisada neutra",
            ["Política de devolução"] = "Devolução gratuita em até 30 dias",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [matchingShoe, wrongPronation]);

        Assert.Single(result.PassedCandidates);
        Assert.Equal(matchingShoe, result.ChosenProduct);
    }

    // Ticket 02 (D3 da spec do exame guiado): a natureza do motivo (ilegibilidade vs.
    // rejeição legítima) precisa ser um valor do contrato atribuído no ponto de criação,
    // não algo que a UI derive relendo a frase. Os sete testes abaixo cobrem, um a um,
    // os sete motivos que EvaluateProduct produz — cada um checando a frase (que não
    // pode mudar de texto) e a natureza (que é o dado novo) juntas.

    [Fact]
    public void Simulate_AttributeRequirementWithoutStructuredData_IsIllegibility()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cor", "azul")]);

        var product = Product("1", "Produto sem specs", attributes: []);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var reason = Assert.Single(Assert.Single(result.FilterOutcomes).UnmetRequirements);
        Assert.Equal("Sem dado estruturado para confirmar 'Cor'.", reason.Message);
        Assert.Equal(UnmetRequirementKind.Illegibility, reason.Kind);
    }

    [Fact]
    public void Simulate_NumericMinimumRequirementWithoutStructuredData_IsIllegibility()
    {
        var requirements = new BuyerOrderRequirements(
            [],
            NumericMinimumRequirements: [new BuyerNumericMinimumRequirement("Autonomia da bateria", 20m, "h")]);

        var product = Product("1", "Produto sem specs", attributes: []);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var reason = Assert.Single(Assert.Single(result.FilterOutcomes).UnmetRequirements);
        Assert.Equal("Sem dado estruturado para confirmar 'Autonomia da bateria' (mínimo 20h).", reason.Message);
        Assert.Equal(UnmetRequirementKind.Illegibility, reason.Kind);
    }

    [Fact]
    public void Simulate_MissingStructuredPriceWhenMaxPriceRequired_IsIllegibility()
    {
        var requirements = new BuyerOrderRequirements([], MaxPrice: 300m);

        var product = Product("1", "Produto sem preço estruturado", price: null);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var reason = Assert.Single(Assert.Single(result.FilterOutcomes).UnmetRequirements);
        Assert.StartsWith("Sem preço estruturado para confirmar o limite de", reason.Message);
        Assert.Equal(UnmetRequirementKind.Illegibility, reason.Kind);
    }

    [Fact]
    public void Simulate_NumericAttributeValueNotRecognizableAsNumber_IsIllegibility()
    {
        // O dado existe, mas em prosa — a máquina não consegue extrair um número dele,
        // não é o produto que falha o requisito. É a linha 4 da tabela do D3.
        var requirements = new BuyerOrderRequirements(
            [],
            NumericMinimumRequirements: [new BuyerNumericMinimumRequirement("Autonomia da bateria", 20m, "h")]);

        var product = Product("1", "Fone com bateria em prosa", attributes: new()
        {
            ["Autonomia da bateria"] = "Dura o dia inteiro sem precisar recarregar",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var reason = Assert.Single(Assert.Single(result.FilterOutcomes).UnmetRequirements);
        Assert.Equal(
            "'Autonomia da bateria' = 'Dura o dia inteiro sem precisar recarregar' não tem valor numérico reconhecível para confirmar o mínimo de 20h.",
            reason.Message);
        Assert.Equal(UnmetRequirementKind.Illegibility, reason.Kind);
    }

    [Fact]
    public void Simulate_AttributeValuePresentButDoesNotConfirmExpectedValue_IsLegitimateRejection()
    {
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")]);

        var product = Product("1", "Fone sem ANC", attributes: new()
        {
            ["Cancelamento de ruído"] = "passivo",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var reason = Assert.Single(Assert.Single(result.FilterOutcomes).UnmetRequirements);
        Assert.Equal("'Cancelamento de ruído' = 'passivo' não confirma 'ativo'.", reason.Message);
        Assert.Equal(UnmetRequirementKind.LegitimateRejection, reason.Kind);
    }

    [Fact]
    public void Simulate_NumericAttributeValueBelowMinimum_IsLegitimateRejection()
    {
        var requirements = new BuyerOrderRequirements(
            [],
            NumericMinimumRequirements: [new BuyerNumericMinimumRequirement("Autonomia da bateria", 20m, "h")]);

        var product = Product("1", "Fone 14h", attributes: new()
        {
            ["Autonomia da bateria"] = "14 horas",
        });

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var reason = Assert.Single(Assert.Single(result.FilterOutcomes).UnmetRequirements);
        Assert.Equal("'Autonomia da bateria' = '14h' abaixo do mínimo de 20h.", reason.Message);
        Assert.Equal(UnmetRequirementKind.LegitimateRejection, reason.Kind);
    }

    [Fact]
    public void Simulate_StructuredPriceAboveMaxPrice_IsLegitimateRejection()
    {
        var requirements = new BuyerOrderRequirements([], MaxPrice: 300m);

        var product = Product("1", "Fone caro", price: 350m);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var reason = Assert.Single(Assert.Single(result.FilterOutcomes).UnmetRequirements);
        Assert.StartsWith("Preço", reason.Message);
        Assert.Contains("acima do limite de", reason.Message);
        Assert.Equal(UnmetRequirementKind.LegitimateRejection, reason.Kind);
    }

    [Fact]
    public void Simulate_ProductAccumulatesReasonsOfBothNaturesInSameEvaluation_BothAppearSeparately()
    {
        // Um pedido real mistura os dois: um requisito sem dado nenhum (ilegibilidade) e
        // um preço estruturado que simplesmente não atende (rejeição legítima). O ticket
        // 02 exige que as duas naturezas apareçam separadamente no mesmo UnmetRequirements,
        // não que uma "vença" ou apague a outra.
        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Cor", "azul")],
            MaxPrice: 300m);

        var product = Product("1", "Produto caro e sem cor estruturada", price: 350m, attributes: []);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.False(outcome.Passed);
        Assert.Equal(2, outcome.UnmetRequirements.Count);

        var illegibilityReason = Assert.Single(
            outcome.UnmetRequirements, r => r.Kind == UnmetRequirementKind.Illegibility);
        Assert.Equal("Sem dado estruturado para confirmar 'Cor'.", illegibilityReason.Message);

        var legitimateRejectionReason = Assert.Single(
            outcome.UnmetRequirements, r => r.Kind == UnmetRequirementKind.LegitimateRejection);
        Assert.Contains("acima do limite de", legitimateRejectionReason.Message);

        Assert.Equal(
            [UnmetRequirementKind.Illegibility, UnmetRequirementKind.LegitimateRejection],
            outcome.UnmetRequirements.Select(r => r.Kind));
    }
}
