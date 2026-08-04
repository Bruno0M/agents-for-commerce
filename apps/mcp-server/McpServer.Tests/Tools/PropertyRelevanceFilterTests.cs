using McpServer.Tools;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 03: proves the deterministic relevance filter kills the exact noise the real
/// smoke test produced (<c>Title: "Default Title"</c>, <c>binding_mount: "Optimistic"</c>)
/// while preserving legitimate properties — and, critically, preserving their
/// <see cref="GeneratedAdditionalProperty.Source"/>, which is what proves extraction
/// rather than invention to a human reviewer. No AI Gateway call: <see cref="PropertyRelevanceFilter"/>
/// is pure and exercised directly.
/// </summary>
public class PropertyRelevanceFilterTests
{
    [Fact]
    public void DropsDefaultTitlePlaceholder_FromAnOptionWithNoRealVariants()
    {
        // Exactly the smoke-test case: a product with no real variant options gets a
        // "Title" option whose sole value is Shopify's own placeholder, not a spec.
        var placeholder = new GeneratedAdditionalProperty("Title", "Default Title", "option");

        Assert.False(PropertyRelevanceFilter.IsRelevant(placeholder));
        Assert.Empty(PropertyRelevanceFilter.Filter([placeholder]));
    }

    [Theory]
    [InlineData("Default Title")]
    [InlineData("default title")]
    [InlineData("  Default Title  ")]
    [InlineData("DEFAULT TITLE")]
    public void DropsPlaceholderValue_RegardlessOfCasingOrSurroundingWhitespace(string placeholderValue)
    {
        var property = new GeneratedAdditionalProperty("Title", placeholderValue, "option");

        Assert.False(PropertyRelevanceFilter.IsRelevant(property));
    }

    [Fact]
    public void DropsMetafieldSourcedProperties_BecauseShopifyKeysAreMachineIdentifiersNotBuyerNames()
    {
        // Exactly the smoke-test case: a raw internal metafield key surfacing as if it
        // were a clean, buyer-facing spec name.
        var internalMetafield = new GeneratedAdditionalProperty("binding_mount", "Optimistic", "metafield");

        Assert.False(PropertyRelevanceFilter.IsRelevant(internalMetafield));
        Assert.Empty(PropertyRelevanceFilter.Filter([internalMetafield]));
    }

    [Fact]
    public void DropsBlankValue_RegardlessOfSource()
    {
        var blank = new GeneratedAdditionalProperty("Cancelamento de ruído", "   ", "description");

        Assert.False(PropertyRelevanceFilter.IsRelevant(blank));
    }

    [Fact]
    public void PreservesLegitimateOptionProperty_ColorIsNotAPlaceholder()
    {
        // .scratch/catalogo-demo/spec.md is explicit that Cor is the one real variant
        // option in the demo catalog, and must keep Source = "option" as the contrast
        // that proves the description-extracted specs weren't invented.
        var color = new GeneratedAdditionalProperty("Cor", "Preto, Areia", "option");

        Assert.True(PropertyRelevanceFilter.IsRelevant(color));

        var filtered = PropertyRelevanceFilter.Filter([color]);
        var survivor = Assert.Single(filtered);
        Assert.Equal("Cor", survivor.Name);
        Assert.Equal("Preto, Areia", survivor.Value);
        Assert.Equal("option", survivor.Source);
    }

    [Fact]
    public void PreservesLegitimateDescriptionExtractedProperty_WithSourceIntact()
    {
        // A verifiable spec extracted from loose description prose (ticket 05) — the
        // class of property this whole feature exists to surface.
        var batteryLife = new GeneratedAdditionalProperty("Autonomia da bateria", "28 horas", "description");

        Assert.True(PropertyRelevanceFilter.IsRelevant(batteryLife));

        var filtered = PropertyRelevanceFilter.Filter([batteryLife]);
        var survivor = Assert.Single(filtered);
        Assert.Equal("Autonomia da bateria", survivor.Name);
        Assert.Equal("28 horas", survivor.Value);
        Assert.Equal("description", survivor.Source);
    }

    [Fact]
    public void FilterOnMixedCandidateList_KeepsOnlyTheRelevantOnesInOrder()
    {
        GeneratedAdditionalProperty[] candidates =
        [
            new("Title", "Default Title", "option"),
            new("Cor", "Grafite, Azul-noite", "option"),
            new("binding_mount", "Optimistic", "metafield"),
            new("Cancelamento de ruído", "Sim, 3 níveis", "description"),
        ];

        var filtered = PropertyRelevanceFilter.Filter(candidates);

        Assert.Equal(2, filtered.Count);
        Assert.Equal(["Cor", "Cancelamento de ruído"], filtered.Select(p => p.Name));
        Assert.Equal(["option", "description"], filtered.Select(p => p.Source));
    }
}
