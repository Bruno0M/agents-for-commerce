using McpServer.Tools;

namespace McpServer.Tests.Tools;

/// <summary>
/// Proves the ticket 01 fix end to end through the production candidate-assembly
/// code (<see cref="BuyerAgentSimulatorTools.ToCandidateProduct"/>), not a
/// reimplementation of it: a product that fails the "antes" round — raw catalog read,
/// no structured data confirming a required characteristic — passes the "depois"
/// round once <c>generate_optimized_content</c> extracts that characteristic from the
/// loose description text into <see cref="ProductCatalogContent.GeneratedProperties"/>.
/// Before this ticket, <c>ProductCatalogContent</c> had no <c>GeneratedProperties</c>
/// field at all and <c>ToCandidateProduct</c> only read options and metafields, so this
/// test could not even be expressed against the old shape — it fails to compile there,
/// which is exactly the "não existe caminho para alimentar o simulador com a versão
/// otimizada" gap the ticket describes.
/// </summary>
public class BuyerAgentSimulatorToolsTests
{
    private static ProductCatalogContent RawProduct(
        string id,
        string title,
        string? descriptionHtml,
        Dictionary<string, string>? options = null) => new(
        Id: id,
        Handle: id,
        Title: title,
        DescriptionHtml: descriptionHtml,
        Vendor: "Marca Teste",
        ProductType: "Jaqueta",
        Status: "ACTIVE",
        Tags: [],
        OnlineStoreUrl: null,
        Options: options is null
            ? []
            : [.. options.Select(o => new ProductOptionContent(o.Key, [o.Value]))],
        Variants: [new ProductVariantContent("v1", "Padrão", "SKU-1", "199.90", true, 10, [])],
        Metafields: [],
        HasSchemaOrgMarkup: false,
        GeneratedProperties: []);

    [Fact]
    public void ProductFailingBeforeRound_PassesAfterRound_WhenRequiredPropertyWasExtracted()
    {
        // "Antes": a Shopify read whose only structured specs are Cor — the description
        // mentions waterproofing in loose text, but nothing structured confirms it.
        var before = RawProduct(
            "1",
            "Jaqueta Trilha X",
            descriptionHtml: "Jaqueta com tecido de tratamento impermeável, ideal para trilha.",
            options: new() { ["Cor"] = "Preta" });

        // "Depois": exactly what ContentGenerationTools.GenerateOptimizedContent does —
        // a `with` expression over the same catalog, adding the description-extracted
        // property while leaving everything else (options, metafields, product type)
        // untouched. This is the unified type from ticket 01, not a different shape.
        var after = before with
        {
            GeneratedProperties = [new GeneratedAdditionalProperty("Impermeável", "Sim", "description")],
        };

        var requirements = new BuyerOrderRequirements(
            [new BuyerAttributeRequirement("Impermeável", "sim")]);

        var beforeResult = BuyerAgentDecisionEngine.Simulate(
            requirements, [BuyerAgentSimulatorTools.ToCandidateProduct(before)]);
        var afterResult = BuyerAgentDecisionEngine.Simulate(
            requirements, [BuyerAgentSimulatorTools.ToCandidateProduct(after)]);

        Assert.Empty(beforeResult.PassedCandidates);
        Assert.Null(beforeResult.ChosenProduct);
        Assert.Contains(
            Assert.Single(beforeResult.FilterOutcomes).UnmetRequirements,
            r => r.Contains("Impermeável"));

        Assert.Single(afterResult.PassedCandidates);
        Assert.NotNull(afterResult.ChosenProduct);
        Assert.Equal("1", afterResult.ChosenProduct!.ProductId);
    }

    [Fact]
    public void ToCandidateProduct_ExposesProductTypeAndDescriptionAsStructuredAttributes()
    {
        var product = RawProduct(
            "2",
            "Fone Bluetooth Z",
            descriptionHtml: "Fone bluetooth com estojo de recarga.");

        var candidate = BuyerAgentSimulatorTools.ToCandidateProduct(product);

        Assert.Equal("Jaqueta", candidate.StructuredAttributes["Tipo de produto"]);
        Assert.Equal(
            "Fone bluetooth com estojo de recarga.",
            candidate.StructuredAttributes["Descrição"]);
    }

    [Fact]
    public void ToCandidateProduct_GeneratedPropertyOverridesNothing_ButIsVisibleAsAttribute()
    {
        var product = RawProduct("3", "Tênis Corrida", descriptionHtml: null)
            with
            {
                GeneratedProperties = [new GeneratedAdditionalProperty("Peso", "250g", "description")],
            };

        var candidate = BuyerAgentSimulatorTools.ToCandidateProduct(product);

        Assert.Equal("250g", candidate.StructuredAttributes["Peso"]);
    }
}
