using McpServer.Auth;

var builder = WebApplication.CreateBuilder(args);

if (string.IsNullOrEmpty(builder.Configuration["MCP_BEARER_TOKEN"]))
{
    throw new InvalidOperationException(
        "The MCP_BEARER_TOKEN environment variable must be set to a non-empty value.");
}

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
    .WithTools<RandomNumberTools>();

var app = builder.Build();

// Runs before MCP (and everything else) so unauthenticated requests never reach MCP logic.
app.UseMiddleware<BearerTokenAuthMiddleware>();

app.MapMcp();

app.Run();
