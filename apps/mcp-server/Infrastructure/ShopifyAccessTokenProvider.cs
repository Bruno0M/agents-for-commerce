using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace McpServer.Infrastructure;

/// <summary>
/// Obtains and caches an Admin API access token via the client credentials grant
/// (<c>POST https://{shop}/admin/oauth/access_token</c>).
///
/// Apps created in the Shopify Dev Dashboard no longer expose a permanent
/// <c>shpat_</c> token — Shopify retired non-expiring tokens on purpose, and the
/// Dev Dashboard hands out a Client ID / Client secret pair instead. The token
/// returned by the grant lives for 24h (<c>expires_in: 86399</c>), so it has to be
/// re-fetched rather than read once from configuration.
///
/// The grant only works for apps built by your own organization and installed in a
/// store you own — and the app must already be installed on the store, otherwise
/// Shopify answers 400 even with valid credentials.
/// </summary>
public sealed partial class ShopifyAccessTokenProvider(
    IHttpClientFactory httpClientFactory,
    string shopDomain,
    string clientId,
    string clientSecret)
{
    // Refresh a little before the real expiry so a request never starts with a token
    // that dies mid-flight.
    private static readonly TimeSpan RenewalMargin = TimeSpan.FromMinutes(5);

    private readonly SemaphoreSlim _refreshGate = new(1, 1);

    // Single reference so the fast path can't observe a token paired with the wrong
    // expiry — replaced wholesale on every refresh.
    private volatile CachedToken? _cached;

    public async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken = default)
    {
        if (_cached is { } cached && !cached.IsExpired)
        {
            return cached.Value;
        }

        await _refreshGate.WaitAsync(cancellationToken);
        try
        {
            // Another caller may have refreshed while we waited on the gate.
            if (_cached is { } current && !current.IsExpired)
            {
                return current.Value;
            }

            var fresh = await FetchAsync(cancellationToken);
            _cached = fresh;
            return fresh.Value;
        }
        finally
        {
            _refreshGate.Release();
        }
    }

    private async Task<CachedToken> FetchAsync(CancellationToken cancellationToken)
    {
        var request = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["grant_type"] = "client_credentials",
        });

        using var httpClient = httpClientFactory.CreateClient();

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsync(
                $"https://{shopDomain}/admin/oauth/access_token", request, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new ShopifyAccessTokenException(
                $"Could not reach Shopify to obtain an Admin API access token: {ex.Message}");
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new ShopifyAccessTokenException(
                    $"Shopify refused the client credentials grant ({(int)response.StatusCode}): {Summarize(body)}. " +
                    "Check that SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET match the app and that the app is installed on the store.");
            }

            AccessTokenResponse? token;
            try
            {
                token = await response.Content.ReadFromJsonAsync<AccessTokenResponse>(cancellationToken);
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                throw new ShopifyAccessTokenException(
                    $"Shopify returned an unparseable access token response: {ex.Message}");
            }

            if (string.IsNullOrEmpty(token?.AccessToken))
            {
                throw new ShopifyAccessTokenException(
                    "Shopify returned a successful response with no access token in it.");
            }

            var lifetime = TimeSpan.FromSeconds(token.ExpiresIn);
            var expiresAt = DateTimeOffset.UtcNow + (lifetime > RenewalMargin ? lifetime - RenewalMargin : lifetime);

            return new CachedToken(token.AccessToken, expiresAt);
        }
    }

    // OAuth failures come back as a full HTML error page, not JSON — the useful part
    // (e.g. "400 - Oauth error application_cannot_be_found") is in the <title>.
    private static string Summarize(string body)
    {
        var title = TitleRegex().Match(body);
        if (title.Success)
        {
            return title.Groups[1].Value.Trim();
        }

        var collapsed = body.Trim();
        return collapsed.Length <= 300 ? collapsed : collapsed[..300] + "…";
    }

    [GeneratedRegex("<title>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex TitleRegex();

    private sealed record CachedToken(string Value, DateTimeOffset ExpiresAt)
    {
        public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAt;
    }

    private sealed record AccessTokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken,
        [property: JsonPropertyName("scope")] string? Scope,
        [property: JsonPropertyName("expires_in")] int ExpiresIn);
}

/// <summary>
/// Raised when an Admin API access token could not be obtained — bad credentials,
/// app not installed on the store, or Shopify unreachable.
/// </summary>
public class ShopifyAccessTokenException(string message) : Exception(message);
