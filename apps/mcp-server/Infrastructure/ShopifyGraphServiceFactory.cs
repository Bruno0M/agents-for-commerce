using ShopifySharp;

namespace McpServer.Infrastructure;

/// <summary>
/// Builds a <see cref="GraphService"/> bound to a currently-valid access token.
/// The service can't be a singleton anymore: ShopifySharp takes the token at
/// construction time, and the token now rotates every 24h (see
/// <see cref="ShopifyAccessTokenProvider"/>). Constructing one per call is cheap —
/// ShopifySharp shares its HttpClient internally.
/// </summary>
public sealed class ShopifyGraphServiceFactory(ShopifyAccessTokenProvider tokenProvider, string shopDomain)
{
    public async Task<GraphService> CreateAsync(CancellationToken cancellationToken = default) =>
        new GraphService(shopDomain, await tokenProvider.GetAccessTokenAsync(cancellationToken));
}
