using McpServer.Tools;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 08: <see cref="MetafieldKeySlugifier"/> is the pure, testable part of
/// <c>write_product_metafields</c> — the part that decides what key a human-readable
/// spec name (e.g. "Cancelamento de ruído", extracted by generate_optimized_content)
/// becomes on the live Shopify store. The write itself needs a real Admin API call
/// (same as CatalogReadTools/PublishTools, neither of which has unit tests either) and
/// is validated live instead, once the store's app scope covers metafield writes.
/// </summary>
public class MetafieldKeySlugifierTests
{
    [Theory]
    [InlineData("Cancelamento de ruído", "cancelamento_de_ruido")]
    [InlineData("Autonomia da bateria", "autonomia_da_bateria")]
    [InlineData("Resistência à água", "resistencia_a_agua")]
    public void StripsAccentsSpacesAndCasing(string name, string expectedKey)
    {
        Assert.Equal(expectedKey, MetafieldKeySlugifier.Slugify(name));
    }

    [Theory]
    [InlineData("  Cor  ", "cor")]
    [InlineData("Tipo de produto!", "tipo_de_produto")]
    [InlineData("50/50", "50_50")]
    public void CollapsesPunctuationAndWhitespaceIntoASingleUnderscore(string name, string expectedKey)
    {
        Assert.Equal(expectedKey, MetafieldKeySlugifier.Slugify(name));
    }

    [Fact]
    public void TwoDifferentNamesThatOnlyDifferByAccentOrCasingProduceTheSameKey()
    {
        // Not a bug this type needs to prevent — Shopify metafield keys are a much
        // smaller alphabet than buyer-facing names, so collisions are an accepted
        // trade-off of this ticket, not something the slugifier is responsible for
        // detecting.
        Assert.Equal(MetafieldKeySlugifier.Slugify("Autonomia"), MetafieldKeySlugifier.Slugify("AUTONOMIA"));
    }

    [Fact]
    public void TruncatesToShopifysSixtyFourCharacterKeyLimit()
    {
        var longName = string.Concat(Enumerable.Repeat("palavra ", 20)).Trim();

        var key = MetafieldKeySlugifier.Slugify(longName);

        Assert.True(key.Length <= 64, $"key '{key}' is {key.Length} chars, over Shopify's 64-char limit");
        Assert.DoesNotContain('.', key);
    }

    [Fact]
    public void NameWithNoAlphanumericCharactersFallsBackToAFixedKey()
    {
        Assert.Equal("spec", MetafieldKeySlugifier.Slugify("???"));
    }

    [Fact]
    public void NeverProducesALeadingOrTrailingUnderscore()
    {
        var key = MetafieldKeySlugifier.Slugify("!Cor!");

        Assert.False(key.StartsWith('_'));
        Assert.False(key.EndsWith('_'));
    }
}
