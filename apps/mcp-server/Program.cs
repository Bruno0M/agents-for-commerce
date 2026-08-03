using System.Net.Http.Headers;
using McpServer.Auth;
using McpServer.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

string RequireConfig(string key) =>
    !string.IsNullOrEmpty(builder.Configuration[key])
        ? builder.Configuration[key]!
        : throw new InvalidOperationException($"The {key} environment variable must be set to a non-empty value.");

RequireConfig("MCP_BEARER_TOKEN");

var aiGatewayOrgSlug = RequireConfig("AI_GATEWAY_ORG_SLUG");
var aiGatewayApiKey = RequireConfig("AI_GATEWAY_API_KEY");

// Studio-hosted OpenAI-compatible proxy for the org's AI Gateway — see
// Infrastructure/AiGatewayClient.cs for how this endpoint was confirmed.
builder.Services.AddHttpClient<AiGatewayClient>(client =>
{
    client.BaseAddress = new Uri($"https://studio.decocms.com/api/{aiGatewayOrgSlug}/");
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", aiGatewayApiKey);
    client.Timeout = TimeSpan.FromSeconds(60);
});

// Add the MCP services: the transport to use (http) and the tools to register.
builder.Services
    .AddMcpServer()
    .WithHttpTransport(options =>
    {
        // Stateless mode is recommended for servers that don't need
        // server-to-client requests like sampling or elicitation.
        // See https://csharp.sdk.modelcontextprotocol.io/concepts/transports/transports.html for details.
        options.Stateless = true;
    })
    .WithToolsFromAssembly();

var app = builder.Build();

// Runs before MCP (and everything else) so unauthenticated requests never reach MCP logic.
app.UseMiddleware<BearerTokenAuthMiddleware>();

app.MapGet("/health", () => Results.Ok());

app.MapMcp();

app.Run();
