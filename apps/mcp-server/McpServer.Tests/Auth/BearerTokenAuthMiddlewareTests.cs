using McpServer.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace McpServer.Tests.Auth;

public class BearerTokenAuthMiddlewareTests
{
    private const string ValidToken = "s3cr3t-token";

    private static BearerTokenAuthMiddleware CreateMiddleware(RequestDelegate next, string? configuredToken = ValidToken)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configuredToken is null
                ? []
                : new Dictionary<string, string?> { ["MCP_BEARER_TOKEN"] = configuredToken })
            .Build();

        return new BearerTokenAuthMiddleware(next, configuration);
    }

    private static DefaultHttpContext CreateContext(string path = "/", string? authorizationHeader = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        if (authorizationHeader is not null)
        {
            context.Request.Headers.Authorization = authorizationHeader;
        }

        return context;
    }

    [Fact]
    public async Task InvokeAsync_NoAuthorizationHeader_Returns401AndDoesNotCallNext()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
        Assert.False(nextCalled);
    }

    [Fact]
    public async Task InvokeAsync_WrongToken_Returns401AndDoesNotCallNext()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext(authorizationHeader: "Bearer wrong-token");

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
        Assert.False(nextCalled);
    }

    [Fact]
    public async Task InvokeAsync_NonBearerScheme_Returns401AndDoesNotCallNext()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext(authorizationHeader: $"Basic {ValidToken}");

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
        Assert.False(nextCalled);
    }

    [Fact]
    public async Task InvokeAsync_CorrectToken_CallsNextAndDoesNotSet401()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext(authorizationHeader: $"Bearer {ValidToken}");

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Assert.NotEqual(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/HEALTH")]
    public async Task InvokeAsync_HealthPath_BypassesAuthEvenWithoutHeader(string path)
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; });
        var context = CreateContext(path: path);

        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Assert.NotEqual(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_TokenNotConfigured_Returns401EvenWithAHeaderPresent()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(_ => { nextCalled = true; return Task.CompletedTask; }, configuredToken: null);
        var context = CreateContext(authorizationHeader: $"Bearer {ValidToken}");

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
        Assert.False(nextCalled);
    }
}
