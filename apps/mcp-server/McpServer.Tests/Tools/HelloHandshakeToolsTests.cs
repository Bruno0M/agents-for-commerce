using System.Reflection;
using System.Text.Json.Nodes;
using McpServer.Tools;
using ModelContextProtocol.Server;

namespace McpServer.Tests.Tools;

/// <summary>
/// Ticket 01: this is the test that would have caught the trap documented in
/// <see cref="HelloHandshakeTools"/> — <c>[McpMeta("ui.resourceUri", "ui://…")]</c> looks
/// right but the SDK treats the name as a literal JsonObject key (no split on "."), so it
/// would emit <c>_meta["ui.resourceUri"]</c> instead of the nested
/// <c>_meta.ui.resourceUri</c> the host's <c>getToolUiResourceUri</c> actually reads.
/// Asserting on the parsed <see cref="JsonObject"/> tree — not on a raw string — is what
/// makes that distinction visible.
/// </summary>
public class HelloHandshakeToolsTests
{
    private static readonly MethodInfo OpenViewMethod =
        typeof(HelloHandshakeTools).GetMethod(nameof(HelloHandshakeTools.OpenHelloHandshakeView))!;

    [Fact]
    public void ProtocolTool_Meta_HasNestedUiResourceUri_MatchingTheResource()
    {
        var tool = McpServerTool.Create(OpenViewMethod);

        var meta = tool.ProtocolTool.Meta;
        Assert.NotNull(meta);

        // Nested access — the shape getToolUiResourceUri prefers — not the flattened
        // "ui/resourceUri" legacy key. If JsonValue had produced a JSON *string* nested
        // under "ui" (e.g. _meta.ui == "{\"resourceUri\":\"...\"}") instead of a real
        // nested object, this indexer chain would throw or return null, not silently
        // pass.
        var uiObject = Assert.IsType<JsonObject>(meta!["ui"]);
        var resourceUri = uiObject["resourceUri"]?.GetValue<string>();

        Assert.Equal(HelloHandshakeResource.ResourceUri, resourceUri);
    }

    [Fact]
    public void ProtocolTool_Meta_DoesNotContainTheLiteralDottedKey()
    {
        // Regression guard for the exact trap: [McpMeta("ui.resourceUri", ...)] would
        // produce this literal-dot key instead of the nested "ui" object.
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
