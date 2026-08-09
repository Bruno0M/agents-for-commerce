using System.Reflection;
using McpServer.Tools;
using ModelContextProtocol.Server;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 04: same contract ticket 01's <c>HelloHandshakeResourceTests</c> asserted —
/// mimeType, the <c>ui://</c> URI, and an explicit <see cref="TextResourceContents"/> — now
/// against the real embedded bundle. Goes through
/// <see cref="McpServerResource.Create(MethodInfo)"/>, exactly like
/// <c>WithResourcesFromAssembly()</c> does, so the risk under test is the SDK's
/// attribute-to-protocol translation, not the pure C# return value.
/// </summary>
public class WebAppResourceTests
{
    private static readonly MethodInfo GetMethod =
        typeof(WebAppResource).GetMethod(nameof(WebAppResource.Get))!;

    [Fact]
    public void ProtocolResource_HasTheMcpAppMimeType()
    {
        var resource = McpServerResource.Create(GetMethod);

        Assert.Equal("text/html;profile=mcp-app", resource.ProtocolResource?.MimeType);
    }

    [Fact]
    public void ProtocolResource_UsesTheSharedUiSchemeUri()
    {
        var resource = McpServerResource.Create(GetMethod);

        Assert.Equal(WebAppResource.ResourceUri, resource.ProtocolResource?.Uri);
        Assert.StartsWith("ui://", resource.ProtocolResource?.Uri);
    }

    [Fact]
    public void Get_ReturnsTheEmbeddedBundle_MatchingTheResourceUriAndMimeType()
    {
        var contents = WebAppResource.Get();

        Assert.Equal(WebAppResource.ResourceUri, contents.Uri);
        Assert.Equal("text/html;profile=mcp-app", contents.MimeType);
        Assert.StartsWith("<!doctype html>", contents.Text, StringComparison.OrdinalIgnoreCase);

        // apps/web's single-file build (issue #5) measured ~650 KB minimum and grew to
        // ~940 KB once the bridge transport (issue #6) pulled in the MCP SDK — a low
        // floor catches the failure mode that matters: Resources/web-app.html silently
        // reverting to a stub or going stale, not a specific byte count.
        Assert.True(
            contents.Text.Length > 100_000,
            $"Expected the embedded /web bundle to be a real build (>100 KB), got {contents.Text.Length} bytes. " +
            "Run apps/mcp-server/scripts/build-web-bundle.sh to regenerate it."
        );
    }

    [Fact]
    public void Get_Html_DoesNotLeakTheBearerTokenEnvVarName()
    {
        // Same guard apps/web's own build-single-file.test.ts asserts at the source —
        // re-asserted here because this is the copy that actually ships in the assembly.
        var html = WebAppResource.Get().Text;

        Assert.DoesNotContain("MCP_BEARER_TOKEN", html, StringComparison.Ordinal);
    }
}
