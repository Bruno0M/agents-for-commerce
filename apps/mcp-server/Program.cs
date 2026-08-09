using System.Net.Http.Headers;
using McpServer.Auth;
using McpServer.Infrastructure;
using McpServer.Tools;
using ModelContextProtocol;
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

// apps/web (Vite SPA) reads the catalog straight from the browser — no bearer token
// in the frontend bundle, so this one GET is exempted from BearerTokenAuthMiddleware
// and opened up via CORS below. Scoped to this single route, not the MCP endpoint.
builder.Services.AddCors(options => options.AddPolicy(
    "catalog-read",
    policy => policy.AllowAnyOrigin().WithMethods("GET")));

builder.Services.AddHttpClient();

// Singleton para que o cache do token seja compartilhado por todas as requisições.
builder.Services.AddSingleton(sp => new ShopifyAccessTokenProvider(
    sp.GetRequiredService<IHttpClientFactory>(),
    shopifyStoreDomain,
    shopifyClientId,
    shopifyClientSecret));

// WithToolsFromAssembly() (below) wires CatalogReadTools into MCP's own tool-call
// dispatch, but doesn't register it as a DI service — the plain GET /catalog route
// resolves it as a minimal-API parameter, so it needs its own registration here.
builder.Services.AddTransient<CatalogReadTools>();

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
    .WithToolsFromAssembly()
    // Ticket 01: registers HelloHandshakeResource's ui:// resource so resources/list and
    // resources/read work — without this, HelloHandshakeTools' _meta.ui.resourceUri points
    // at a resource the server never serves, and the Studio iframe gets nothing back.
    .WithResourcesFromAssembly();

var app = builder.Build();

app.UseCors();

// Runs before MCP (and everything else) so unauthenticated requests never reach MCP logic.
app.UseMiddleware<BearerTokenAuthMiddleware>();

app.MapGet("/health", () => Results.Ok());

// Plain JSON mirror of the get_product_catalog MCP tool (ticket 01), for apps/web —
// a browser can't speak MCP's JSON-RPC transport. Same CatalogReadTools call, same
// ProductCatalogReadResult shape, so there's exactly one place that knows how to read
// the catalog.
app.MapGet("/catalog", async (CatalogReadTools catalogTools, CancellationToken cancellationToken) =>
{
    try
    {
        var result = await catalogTools.GetProductCatalog(cancellationToken);
        return Results.Ok(result);
    }
    catch (McpException ex)
    {
        return Results.Problem(ex.Message, statusCode: StatusCodes.Status502BadGateway);
    }
})
.RequireCors("catalog-read");

app.MapMcp();

app.Run();
