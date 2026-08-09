using System.Reflection;
using System.Text.Json.Nodes;
using McpServer.Tools;
using ModelContextProtocol.Server;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 04: same trap ticket 01's <c>HelloHandshakeToolsTests</c> guarded against —
/// <c>[McpMeta("ui.resourceUri", ...)]</c> would emit a literal dotted key instead of the
/// nested <c>_meta.ui.resourceUri</c> the host's <c>getToolUiResourceUri</c> reads — now for
/// the tool that mounts the real bundle.
/// </summary>
public class WebAppToolsTests
{
    private static readonly MethodInfo OpenViewMethod =
        typeof(WebAppTools).GetMethod(nameof(WebAppTools.OpenWebAppView))!;

    [Fact]
    public void ProtocolTool_Meta_HasNestedUiResourceUri_MatchingTheResource()
    {
        var tool = McpServerTool.Create(OpenViewMethod);

        var meta = tool.ProtocolTool.Meta;
        Assert.NotNull(meta);

        var uiObject = Assert.IsType<JsonObject>(meta!["ui"]);
        var resourceUri = uiObject["resourceUri"]?.GetValue<string>();

        Assert.Equal(WebAppResource.ResourceUri, resourceUri);
    }

    [Fact]
    public void ProtocolTool_Meta_DoesNotContainTheLiteralDottedKey()
    {
        var tool = McpServerTool.Create(OpenViewMethod);

        Assert.Null(tool.ProtocolTool.Meta?["ui.resourceUri"]);
    }

    [Fact]
    public void ProtocolTool_HasNoInputSchemaProperties()
    {
        // D4: a tool nulária burra — no caller-supplied parameters.
        var tool = McpServerTool.Create(OpenViewMethod);

        var hasProperties = tool.ProtocolTool.InputSchema.TryGetProperty("properties", out var properties)
            && properties.EnumerateObject().Any();

        Assert.False(hasProperties);
    }
}
