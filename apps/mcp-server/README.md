# MCP Server

This README was created using the C# MCP server project template.
It demonstrates how you can easily create an MCP server using C# and run it as an ASP.NET Core web application.

The MCP server is built as a framework-dependent application and requires the ASP.NET Core runtime to be installed on the target machine.
The application is configured to roll-forward to the next highest major version of the runtime if one is available on the target machine.
If an applicable .NET runtime is not available, the MCP server will not start.
Consider building the MCP server as a self-contained application if you want to avoid this dependency.

## Developing locally

To test this MCP server from source code (locally), you can configure your IDE to connect to the server using localhost.

```json
{
  "servers": {
    "McpServer": {
      "type": "http",
      "url": "http://localhost:6142"
    }
  }
}
```

Refer to the VS Code or Visual Studio documentation for more information on configuring and using MCP servers:

- [Use MCP servers in VS Code](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
- [Use MCP servers in Visual Studio](https://learn.microsoft.com/visualstudio/ide/mcp-servers)

## Testing the MCP Server

Once configured, ask the client to list the available tools, or use `McpServer.http` to send a `tools/list` request directly.

## Known issues

1. When using VS Code, connecting to `https://localhost:5250` fails.
  * This is related to using a self-signed developer certificate, even when the certificate is trusted by the system.
  * Connecting with `http://localhost:6142` succeeds.
  * See [Cannot connect to MCP server via SSE using trusted developer certificate (microsoft/vscode#248170)](https://github.com/microsoft/vscode/issues/248170) for more information.

## More information

ASP.NET Core MCP servers use the [ModelContextProtocol.AspNetCore](https://www.nuget.org/packages/ModelContextProtocol.AspNetCore) package from the MCP C# SDK. For more information about MCP:

- [Official Documentation](https://modelcontextprotocol.io/)
- [Protocol Specification](https://spec.modelcontextprotocol.io/)
- [GitHub Organization](https://github.com/modelcontextprotocol)
- [MCP C# SDK](https://csharp.sdk.modelcontextprotocol.io/)
