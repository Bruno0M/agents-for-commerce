using System.ComponentModel;
using System.Reflection;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

/// <summary>
/// Ticket 04 (`web-como-view-do-studio`, issue #7): the real <c>apps/web</c> bundle, served
/// as the <c>ui://</c> resource in place of the "hello" bundle ticket 01 proved the handshake
/// with. Same resource/tool/handshake contract ticket 01 already confirmed — the only thing
/// that changed is where the HTML comes from.
/// </summary>
[McpServerResourceType]
public static class WebAppResource
{
    // Shared with WebAppTools so the resource URI and the tool's _meta.ui.resourceUri
    // can't drift silently — see HelloHandshakeTools' (ticket 01) note on what happens
    // when they do: the tool just stops appearing as a view candidate, with no error.
    public const string ResourceUri = "ui://web/app";

    // Exact contract string from spec.md, confirmed against the host in ticket 01.
    private const string MimeType = "text/html;profile=mcp-app";

    // Must match the <LogicalName> set on the <EmbeddedResource> in McpServer.csproj.
    private const string EmbeddedResourceName = "McpServer.Resources.web-app.html";

    // Read once: the embedded manifest resource is fixed for the lifetime of the
    // process (it only changes by rebuilding the assembly), so there's nothing to gain
    // from re-reading a ~1 MB stream on every resources/read.
    private static readonly Lazy<string> Html = new(ReadEmbeddedHtml);

    [McpServerResource(UriTemplate = ResourceUri, Name = "web_app_page", MimeType = MimeType, Title = "Exame de legibilidade agêntica")]
    [Description("O /web completo — a view do exame de legibilidade agêntica — embutido como resource MCP e servido dentro do iframe do Deco Studio.")]
    public static TextResourceContents Get() =>
        new()
        {
            Uri = ResourceUri,
            MimeType = MimeType,
            Text = Html.Value,
        };

    private static string ReadEmbeddedHtml()
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream(EmbeddedResourceName)
            ?? throw new InvalidOperationException(
                $"Embedded resource '{EmbeddedResourceName}' not found. Run " +
                "apps/mcp-server/scripts/build-web-bundle.sh to regenerate " +
                "Resources/web-app.html, then rebuild.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
