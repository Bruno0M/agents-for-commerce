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
        Assert.Contains(outcome.UnmetRequirements, r => r.Contains("Cancelamento de ruído"));
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
        Assert.Contains(outcome.UnmetRequirements, r => r.Contains("acima do limite"));
    }

    [Fact]
    public void Simulate_MissingPriceWhenMaxPriceRequired_IsDiscarded()
    {
        var requirements = new BuyerOrderRequirements([], MaxPrice: 300m);

        var product = Product("1", "Fone sem preço estruturado", price: null);

        var result = BuyerAgentDecisionEngine.Simulate(requirements, [product]);

        Assert.Empty(result.PassedCandidates);
        var outcome = Assert.Single(result.FilterOutcomes);
        Assert.Contains(outcome.UnmetRequirements, r => r.Contains("Sem preço estruturado"));
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
}
