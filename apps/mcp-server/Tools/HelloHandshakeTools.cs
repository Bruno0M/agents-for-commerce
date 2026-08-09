using System.ComponentModel;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

/// <summary>
/// Ticket 01 (`.scratch/web-como-view-do-studio/issues/01-handshake-com-bundle-minimo.md`):
/// a tool hospedeira nulária e burra (D4 da spec) que só existe para carregar
/// <c>_meta.ui.resourceUri</c> apontando pro resource de <see cref="HelloHandshakeResource"/>.
/// Não recebe parâmetro, não devolve dado de domínio, não chama Shopify nem AI Gateway.
/// </summary>
[McpServerToolType]
public static class HelloHandshakeTools
{
    // The obvious-looking [McpMeta("ui.resourceUri", "ui://…")] is a trap: McpMetaAttribute
    // uses `name` as a literal JsonObject key — it does not split on ".", so that call would
    // emit _meta["ui.resourceUri"] (one key, with a literal dot). The host's
    // getToolUiResourceUri only recognizes _meta.ui.resourceUri nested, or the flattened
    // legacy key _meta["ui/resourceUri"] (with a slash) — neither matches, and the tool would
    // silently fail to appear as a view candidate.
    //
    // The fix is JsonValue: passing a JSON object literal under the "ui" key produces the
    // real nested shape { "ui": { "resourceUri": "..." } }, confirmed against the actual SDK
    // (see HelloHandshakeToolsTests) rather than assumed from the attribute's shape. No
    // programmatic McpServerToolCreateOptions.Meta registration was needed — the declarative
    // attribute path works as long as JsonValue carries the nesting instead of the
    // constructor's flat (name, value) overloads.
    [McpServerTool(Name = "hello_handshake_view")]
    [McpMeta("ui", JsonValue = $$"""{"resourceUri":"{{HelloHandshakeResource.ResourceUri}}"}""")]
    [Description("Tool nulária que só serve de ponto de montagem para a view de handshake (ticket 01) — não recebe parâmetro e não devolve dado de domínio. Declara _meta.ui.resourceUri para o Deco Studio renderizar o resource ui://hello-handshake/app dentro de um iframe.")]
    public static string OpenHelloHandshakeView() => "ok";
}
