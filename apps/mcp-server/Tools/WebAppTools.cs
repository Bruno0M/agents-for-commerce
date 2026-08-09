using System.ComponentModel;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

/// <summary>
/// Ticket 04 (`web-como-view-do-studio`, issue #7): the nullary, dumb hosting tool (D4 of
/// the spec) that only exists to carry <c>_meta.ui.resourceUri</c> pointing at
/// <see cref="WebAppResource"/>. Replaces <c>HelloHandshakeTools</c> from ticket 01 — same
/// shape, same tested <c>_meta</c> nesting, now pointing at the real bundle.
/// </summary>
[McpServerToolType]
public static class WebAppTools
{
    [McpServerTool(Name = "open_web_app_view")]
    [McpMeta("ui", JsonValue = $$"""{"resourceUri":"{{WebAppResource.ResourceUri}}"}""")]
    [Description("Tool nulária que só serve de ponto de montagem para a view do /web (ticket 04) — não recebe parâmetro e não devolve dado de domínio. Declara _meta.ui.resourceUri para o Deco Studio renderizar o resource ui://web/app dentro de um iframe.")]
    public static string OpenWebAppView() => "ok";
}
