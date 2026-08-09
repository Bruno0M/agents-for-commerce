using System.Security.Cryptography;
using System.Text;

namespace McpServer.Auth;

/// <summary>
/// Requires a valid <c>Authorization: Bearer &lt;token&gt;</c> header on every request,
/// except for paths in <see cref="ExemptPaths"/> (e.g. the health check endpoint).
/// The expected token is read from the <c>MCP_BEARER_TOKEN</c> configuration key
/// (populated from the environment variable of the same name).
/// </summary>
public class BearerTokenAuthMiddleware(RequestDelegate next, IConfiguration configuration)
{
    private const string BearerPrefix = "Bearer ";

    private static readonly string[] ExemptPaths = ["/health", "/catalog"];

    private readonly string? _expectedToken = configuration["MCP_BEARER_TOKEN"];

    public async Task InvokeAsync(HttpContext context)
    {
        if (IsExempt(context.Request.Path))
        {
            await next(context);
            return;
        }

        if (!IsAuthorized(context.Request))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        await next(context);
    }

    private static bool IsExempt(PathString path) =>
        ExemptPaths.Any(exempt => path.Equals(exempt, StringComparison.OrdinalIgnoreCase));

    private bool IsAuthorized(HttpRequest request)
    {
        if (string.IsNullOrEmpty(_expectedToken))
        {
            return false;
        }

        var headerValue = request.Headers.Authorization.ToString();
        if (!headerValue.StartsWith(BearerPrefix, StringComparison.Ordinal))
        {
            return false;
        }

        var providedToken = headerValue[BearerPrefix.Length..];
        return FixedTimeEquals(providedToken, _expectedToken);
    }

    // Hash first so both operands are always the same length: a length check before
    // FixedTimeEquals would itself leak the token's length through timing.
    private static bool FixedTimeEquals(string a, string b)
    {
        var aHash = SHA256.HashData(Encoding.UTF8.GetBytes(a));
        var bHash = SHA256.HashData(Encoding.UTF8.GetBytes(b));

        return CryptographicOperations.FixedTimeEquals(aHash, bHash);
    }
}
