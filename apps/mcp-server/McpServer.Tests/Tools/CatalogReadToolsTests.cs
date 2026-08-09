using McpServer.Tools;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 01: exercises <see cref="CatalogReadTools.AssembleCatalog"/> — the pure
/// "pages fetched from the Admin GraphQL products connection → response shape" step
/// of <c>get_product_catalog</c> — directly with in-memory <see cref="GraphProduct"/>
/// fixtures, since <see cref="McpServer.Infrastructure.ShopifyGraphServiceFactory"/>
/// builds a concrete <c>GraphService</c> with no interface to mock (same constraint
/// <c>CatalogReadTools</c>/<c>PublishTools</c> already live with — see
/// <c>MetafieldKeySlugifierTests</c>). What's asserted here is the part that actually
/// has logic: merging more than one page in order, and — the ticket's explicit
/// acceptance criterion — never silently truncating when the store has more active
/// products than the safety cap allows.
/// </summary>
public class CatalogReadToolsTests
{
    private static GraphProduct Product(string handle) => new()
    {
        Id = $"gid://shopify/Product/{handle}",
        Handle = handle,
        Title = handle,
        Status = "ACTIVE",
    };

    private static CatalogPage Page(int count, string prefix, bool hasNextPage) =>
        new([.. Enumerable.Range(1, count).Select(i => Product($"{prefix}-{i}"))], hasNextPage);

    [Fact]
    public void AssembleCatalog_MergesMultiplePages_InOrderWithoutReachingTheCap()
    {
        var pages = new[]
        {
            Page(3, "page1", hasNextPage: true),
            Page(2, "page2", hasNextPage: false),
        };

        var result = CatalogReadTools.AssembleCatalog(pages, limit: 50);

        Assert.Equal(5, result.Products.Count);
        Assert.Equal(50, result.ProductLimit);
        Assert.False(result.ReachedProductLimit);
        Assert.Equal(
            ["page1-1", "page1-2", "page1-3", "page2-1", "page2-2"],
            result.Products.Select(p => p.Handle));
    }

    [Fact]
    public void AssembleCatalog_TruncatesMidPage_WhenTheCapFallsInsideAPage()
    {
        // The cap (15) lands in the middle of the second page (10 items): there are
        // provably more real products right there in the same page, so the limit was
        // reached regardless of what that page's own hasNextPage says.
        var pages = new[]
        {
            Page(10, "page1", hasNextPage: true),
            Page(10, "page2", hasNextPage: false),
        };

        var result = CatalogReadTools.AssembleCatalog(pages, limit: 15);

        Assert.Equal(15, result.Products.Count);
        Assert.True(result.ReachedProductLimit);
        Assert.Equal("page2-5", result.Products[^1].Handle);
    }

    [Fact]
    public void AssembleCatalog_CapLandsExactlyOnAPageBoundary_WithMoreProductsAfter_MarksLimitReached()
    {
        var pages = new[]
        {
            Page(10, "page1", hasNextPage: true),
            Page(10, "page2", hasNextPage: true), // store has an 21st+ product beyond this page
        };

        var result = CatalogReadTools.AssembleCatalog(pages, limit: 20);

        Assert.Equal(20, result.Products.Count);
        Assert.True(result.ReachedProductLimit);
    }

    [Fact]
    public void AssembleCatalog_CapLandsExactlyOnAPageBoundary_WithNoMoreProductsAfter_DoesNotMarkLimitReached()
    {
        // Same shape as the previous test (20 collected across two full pages of 10),
        // but the store genuinely has no more — the cap being a round multiple of the
        // page size must not be mistaken for truncation.
        var pages = new[]
        {
            Page(10, "page1", hasNextPage: true),
            Page(10, "page2", hasNextPage: false),
        };

        var result = CatalogReadTools.AssembleCatalog(pages, limit: 20);

        Assert.Equal(20, result.Products.Count);
        Assert.False(result.ReachedProductLimit);
    }

    [Fact]
    public void AssembleCatalog_ProducesTheSameShapeGetProductContentReturns()
    {
        // Acceptance criterion: no wrapper field leaks into the items themselves —
        // Products has to be assignable straight into simulate_buyer_agent's catalog
        // argument (IReadOnlyList<ProductCatalogContent>), which this line only
        // compiles if the shapes genuinely match.
        var result = CatalogReadTools.AssembleCatalog([Page(1, "solo", hasNextPage: false)], limit: 50);

        IReadOnlyList<ProductCatalogContent> catalog = result.Products;

        Assert.Single(catalog);
    }
}
