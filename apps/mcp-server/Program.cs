using System.Net.Http.Headers;
using McpServer.Auth;
using McpServer.Infrastructure;
using ShopifySharp;

var builder = WebApplication.CreateBuilder(args);

string RequireConfig(string key) =>
    !string.IsNullOrEmpty(builder.Configuration[key])
        ? builder.Configuration[key]!
        : throw new InvalidOperationException($"The {key} environment variable must be set to a non-empty value.");

RequireConfig("MCP_BEARER_TOKEN");

var aiGatewayOrgSlug = RequireConfig("AI_GATEWAY_ORG_SLUG");
var aiGatewayApiKey = RequireConfig("AI_GATEWAY_API_KEY");
var aiGatewayModel = builder.Configuration["AI_GATEWAY_MODEL"];

// Accepts either the bare store name (as stored in the storefront's own Shopify
// block config, e.g. "afc-store-o7xzc4c2") or the full *.myshopify.com domain —
// ShopifySharp/Shopify's API only reliably works against the *.myshopify.com form.
var shopifyStoreDomain = RequireConfig("SHOPIFY_STORE_DOMAIN");
if (!shopifyStoreDomain.Contains('.', StringComparison.Ordinal))
{
    shopifyStoreDomain += ".myshopify.com";
}

// Apps do Dev Dashboard não têm mais token permanente: o par Client ID/secret é
// trocado por um token de 24h via client credentials grant — ver ShopifyAccessTokenProvider.
var shopifyClientId = RequireConfig("SHOPIFY_CLIENT_ID");
var shopifyClientSecret = RequireConfig("SHOPIFY_CLIENT_SECRET");

var studioApiKey = RequireConfig("STUDIO_API_KEY");

builder.Services.AddHttpClient();

// Singleton para que o cache do token seja compartilhado por todas as requisições.
builder.Services.AddSingleton(sp => new ShopifyAccessTokenProvider(
    sp.GetRequiredService<IHttpClientFactory>(),
    shopifyStoreDomain,
    shopifyClientId,
    shopifyClientSecret));

builder.Services.AddSingleton(sp => new ShopifyGraphServiceFactory(
    sp.GetRequiredService<ShopifyAccessTokenProvider>(),
    shopifyStoreDomain));

// Same Studio org as the AI Gateway client (aiGatewayOrgSlug) — "mcp/self" is the
// Studio's own MCP server for its management tools (Task Board, API keys, etc.),
// as opposed to "v1/chat/completions" (AI Gateway proxy).
builder.Services.AddSingleton(sp => new StudioTaskBoardClient(
    sp.GetRequiredService<IHttpClientFactory>(),
    new Uri($"https://studio.decocms.com/api/{aiGatewayOrgSlug}/mcp/self"),
    studioApiKey));

builder.Services.AddSingleton(new AiGatewayOptions(
    string.IsNullOrEmpty(aiGatewayModel) ? "anthropic/claude-sonnet-5" : aiGatewayModel));

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
