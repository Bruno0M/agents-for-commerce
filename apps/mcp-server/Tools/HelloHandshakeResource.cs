using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

/// <summary>
/// Ticket 01 (`.scratch/web-como-view-do-studio/issues/01-handshake-com-bundle-minimo.md`):
/// um resource MCP <c>ui://</c> mínimo, servido só para provar que resource + <c>_meta</c> +
/// handshake sobem antes do bundle real do <c>/web</c> (ticket 02+) entrar em cena — ver D5
/// da spec. Nenhuma linha aqui fala com o catálogo, com a Shopify ou com o AI Gateway.
/// </summary>
[McpServerResourceType]
public static class HelloHandshakeResource
{
    // Shared with HelloHandshakeTools so the resource URI and the tool's
    // _meta.ui.resourceUri can't drift silently — a URI on one side that doesn't match the
    // other fails without any error: the host just doesn't list the tool as a view candidate.
    public const string ResourceUri = "ui://hello-handshake/app";

    // Exact contract string from spec.md ("O contrato, verificado no código") — the host
    // doesn't compare it anywhere today, but it's the documented and tested value, so this
    // emits it exactly rather than the more obvious plain "text/html".
    private const string MimeType = "text/html;profile=mcp-app";

    [McpServerResource(UriTemplate = ResourceUri, Name = "hello_handshake_page", MimeType = MimeType, Title = "Hello handshake")]
    [Description("Página HTML mínima usada só para provar que o handshake ui/initialize do Deco Studio completa dentro do iframe da view, antes do bundle real do /web substituí-la.")]
    public static TextResourceContents Get() =>
        // Returned explicitly instead of a bare `string` (which the [McpServerResource]
        // MimeType attribute may or may not propagate onto — unconfirmed on SDK 1.2.0) so
        // Uri/MimeType/Text are unambiguous regardless of how the SDK's string-return path
        // behaves.
        new()
        {
            Uri = ResourceUri,
            MimeType = MimeType,
            Text = Html,
        };

    // Handshake protocol implemented by hand, no library: register a "message" listener,
    // postMessage a JSON-RPC "ui/initialize" request to window.parent with id: 1 and the
    // required (if empty) appCapabilities, wait for the response carrying that same id, then
    // postMessage the "ui/notifications/initialized" notification (no id). Zero network
    // requests — CSS and JS are inline, and the host's CSP blocks connect-src anyway.
    //
    // The top-level JSON-RPC messages exchanged here must stay exactly two keys deep
    // (jsonrpc/id/method/params, or jsonrpc/id/result) — JSONRPCMessageSchema is `.strict()`
    // at the root on the host, so an extra top-level key gets the whole message dropped
    // silently.
    private const string Html = """
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>hello handshake</title>
            <style>
              body {
                margin: 0;
                padding: 2rem;
                font-family: ui-monospace, "SF Mono", Consolas, monospace;
                background: #0b0b0f;
                color: #e6e6ef;
              }
              pre {
                white-space: pre-wrap;
                word-break: break-word;
                font-size: 0.95rem;
              }
            </style>
          </head>
          <body>
            <pre id="status">connecting…</pre>
            <script>
              (function () {
                window.addEventListener("message", function (event) {
                  var data = event.data;
                  if (!data || data.jsonrpc !== "2.0") return;
                  if (data.id === 1 && data.result) {
                    window.parent.postMessage({ jsonrpc: "2.0", method: "ui/notifications/initialized" }, "*");
                    document.getElementById("status").textContent =
                      "connected to " + JSON.stringify((data.result.hostInfo || {}).name || "host");
                  }
                });
                window.parent.postMessage({
                  jsonrpc: "2.0", id: 1, method: "ui/initialize",
                  params: { appInfo: { name: "hello", version: "0.0.1" }, appCapabilities: {}, protocolVersion: "2026-01-26" }
                }, "*");
              })();
            </script>
          </body>
        </html>
        """;
}
