using System.Reflection;
using McpServer.Tools;
using ModelContextProtocol.Server;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 01: asserts the two facts the spec's Testing Decisions call out as "o contrato
/// inteiro do lado .NET" — the resource's <c>mimeType</c> and its <c>ui://</c> URI — by
/// going through <see cref="McpServerResource.Create(MethodInfo)"/> exactly like
/// <c>WithResourcesFromAssembly()</c> does, instead of just calling
/// <see cref="HelloHandshakeResource.Get"/> directly and checking the returned
/// <c>TextResourceContents</c> — the risk this ticket is about lives in what the SDK's
/// attribute-to-protocol translation produces, not in the pure C# return value.
/// </summary>
public class HelloHandshakeResourceTests
{
    private static readonly MethodInfo GetMethod =
        typeof(HelloHandshakeResource).GetMethod(nameof(HelloHandshakeResource.Get))!;

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

        Assert.Equal(HelloHandshakeResource.ResourceUri, resource.ProtocolResource?.Uri);
        Assert.StartsWith("ui://", resource.ProtocolResource?.Uri);
    }

    [Fact]
    public void Get_ReturnsExplicitTextResourceContents_MatchingTheResourceUriAndMimeType()
    {
        // Returned explicitly (not a bare string) so Uri/MimeType/Text are unambiguous
        // regardless of whether the SDK propagates [McpServerResource]'s MimeType onto a
        // string return value — see HelloHandshakeResource.Get for the full rationale.
        var contents = HelloHandshakeResource.Get();

        Assert.Equal(HelloHandshakeResource.ResourceUri, contents.Uri);
        Assert.Equal("text/html;profile=mcp-app", contents.MimeType);
        Assert.NotEmpty(contents.Text);
    }

    [Fact]
    public void Get_Html_HasNoNetworkReferences()
    {
        // Acceptance criterion: "Todo CSS e JS é inline; a página não faz nenhuma
        // requisição de rede". src=/href= pointing anywhere external (http, https,
        // protocol-relative //, or a bare relative path) would violate that, and would
        // also break under the host's default connect-src 'none' CSP.
        var html = HelloHandshakeResource.Get().Text;

        Assert.DoesNotContain("src=", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("href=", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("fetch(", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("XMLHttpRequest", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("WebSocket", html, StringComparison.OrdinalIgnoreCase);
    }
}
