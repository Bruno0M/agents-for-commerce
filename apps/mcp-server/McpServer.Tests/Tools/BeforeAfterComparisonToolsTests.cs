using McpServer.Tools;

namespace McpServer.Tests.Tools;

/// <summary>
/// Exercises BeforeAfterComparisonTools.BuildComparison directly with a fixed
/// BuyerOrderRequirements — no AI Gateway call — mirroring how
/// BuyerAgentSimulatorToolsTests tests ToCandidateProduct/BuyerAgentDecisionEngine.Simulate
/// without the extraction step. Shapes a miniature version of the demo catalog
/// (.scratch/catalogo-demo/spec.md): one legitimate candidate that only passes once
/// generate_optimized_content has landed the ANC spec, and one control that must be
/// rejected in both rounds.
/// </summary>
public class BeforeAfterComparisonToolsTests
{
    private static ProductCatalogContent RawProduct(
        string handle,
        string title,
        decimal price,
        Dictionary<string, string>? generatedProperties = null) => new(
        Id: $"gid://shopify/Product/{handle}",
        Handle: handle,
        Title: title,
        DescriptionHtml: "Descrição solta, sem specs estruturadas.",
        Vendor: "Marca Teste",
        ProductType: "Fones de ouvido",
        Status: "ACTIVE",
        Tags: [],
        OnlineStoreUrl: null,
        Options: [],
        Variants: [new ProductVariantContent("v1", "Padrão", "SKU-1", price.ToString("0.00"), true, 10, [])],
        Metafields: [],
        HasSchemaOrgMarkup: false,
        GeneratedProperties: generatedProperties is null
            ? []
            : [.. generatedProperties.Select(p => new GeneratedAdditionalProperty(p.Key, p.Value, "description"))]);

    private static readonly BuyerOrderRequirements RequestA = new(
        [new BuyerAttributeRequirement("Cancelamento de ruído", "ativo")],
        MaxPrice: 300m);

    [Fact]
    public void BuildComparison_LegitimateCandidateFailsBeforeAndPassesAfter_MatchesExpectedClassificationBothRounds()
    {
        var before = new List<ProductCatalogContent>
        {
            RawProduct("aurora-nc7", "Aurora NC7", 289m),
            RawProduct("corvo-sport-2", "Corvo Sport 2", 189m),
        };
        var after = new List<ProductCatalogContent>
        {
            RawProduct("aurora-nc7", "Aurora NC7", 289m, new() { ["Cancelamento de ruído"] = "Ativo" }),
            RawProduct("corvo-sport-2", "Corvo Sport 2", 189m, new() { ["Cancelamento de ruído"] = "Não" }),
        };
        var expectedOutcomes = new List<ExpectedProductOutcome>
        {
            new("aurora-nc7", ShouldPass: true),
            new("corvo-sport-2", ShouldPass: false),
        };

        var result = BeforeAfterComparisonTools.BuildComparison(
            "fone com ANC até R$300", RequestA, before, after, expectedOutcomes);

        var aurora = result.Products.Single(p => p.Handle == "aurora-nc7");
        Assert.False(aurora.PassedBefore);
        Assert.True(aurora.PassedAfter);
        Assert.False(aurora.CorrectlyClassifiedBefore); // devia passar, mas foi rejeitado por falta de dado estruturado
        Assert.True(aurora.CorrectlyClassifiedAfter);
        Assert.Contains(aurora.UnmetRequirementsBefore, r => r.Message.Contains("Cancelamento de ruído"));
        Assert.Contains(aurora.ConfirmedRequirementsAfter, r => r.Contains("Cancelamento de ruído"));

        var corvo = result.Products.Single(p => p.Handle == "corvo-sport-2");
        Assert.False(corvo.PassedBefore);
        Assert.False(corvo.PassedAfter);
        Assert.True(corvo.CorrectlyClassifiedBefore); // devia rejeitar, e rejeitou (mesmo que pela razão errada)
        Assert.True(corvo.CorrectlyClassifiedAfter);

        Assert.Equal(1, result.Before.CorrectlyClassifiedCount);
        Assert.Equal(2, result.Before.TotalClassifiedProducts);
        Assert.Equal(2, result.After.CorrectlyClassifiedCount);
        Assert.Equal(2, result.After.TotalClassifiedProducts);
        Assert.Equal(1, result.SuccessRateDeltaCount);
        Assert.True(result.SuccessRateDelta > 0);
    }

    [Fact]
    public void BuildComparison_NoExpectedOutcomeForProduct_LeavesItOutOfSuccessRateDenominator()
    {
        var before = new List<ProductCatalogContent> { RawProduct("aurora-nc7", "Aurora NC7", 289m) };
        var after = new List<ProductCatalogContent>
        {
            RawProduct("aurora-nc7", "Aurora NC7", 289m, new() { ["Cancelamento de ruído"] = "Ativo" }),
        };

        var result = BeforeAfterComparisonTools.BuildComparison(
            "fone com ANC até R$300", RequestA, before, after, expectedOutcomes: null);

        var product = Assert.Single(result.Products);
        Assert.Null(product.ExpectedToPass);
        Assert.Null(product.CorrectlyClassifiedBefore);
        Assert.Null(product.CorrectlyClassifiedAfter);
        Assert.Equal(0, result.Before.TotalClassifiedProducts);
        Assert.Equal(0, result.After.TotalClassifiedProducts);
    }

    [Fact]
    public void BuildComparison_AfterCatalogMissingAProductFromBefore_ThrowsMcpException()
    {
        var before = new List<ProductCatalogContent>
        {
            RawProduct("aurora-nc7", "Aurora NC7", 289m),
            RawProduct("corvo-sport-2", "Corvo Sport 2", 189m),
        };
        var after = new List<ProductCatalogContent> { RawProduct("aurora-nc7", "Aurora NC7", 289m) };

        var ex = Assert.Throws<ModelContextProtocol.McpException>(() =>
            BeforeAfterComparisonTools.BuildComparison(
                "fone com ANC até R$300", RequestA, before, after, expectedOutcomes: null));

        Assert.Contains("corvo-sport-2", ex.Message);
    }
}
