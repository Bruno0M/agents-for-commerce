using ModelContextProtocol;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;

namespace McpServer.Infrastructure;

/// <summary>
/// Thin client for the Studio's own MCP server ("self" management tools) — used by
/// <c>PublishTools</c> (ticket 07) to call <c>TASK_BOARD_ITEM_CREATE</c>. Same
/// <c>https://studio.decocms.com/api/{org}/...</c> base as the AI Gateway client
/// (ticket 03), but a different sub-path (<c>mcp/self</c>, not <c>v1/chat/completions</c>)
/// and a real MCP (JSON-RPC over Streamable HTTP) session rather than a REST call.
///
/// Auth is a dedicated Studio API key (<c>STUDIO_API_KEY</c>) scoped to
/// <c>{"self": ["TASK_BOARD_ITEM_CREATE"]}</c> — separate from the AI Gateway key
/// (ticket 03), which only has <c>ORGANIZATION_GET</c> and can't call Task Board tools.
///
/// A fresh MCP session is opened per call instead of held open — this is a low
/// frequency, one-shot call, and it mirrors the stateless choice already made for
/// this server's own MCP transport (see ADR 0001) rather than adding session
/// lifetime management for it.
///
/// <see cref="CreateItemAsync"/> always sends an <c>assigneeId</c> (ticket 05) —
/// without one, a created item stays in <c>triage</c> forever instead of being
/// picked up by the Super Agent (see ADR 0004). <see cref="SuperAgentAssigneeId"/>
/// is the reserved value for that delegation.
/// </summary>
public sealed class StudioTaskBoardClient(IHttpClientFactory httpClientFactory, Uri endpoint, string apiKey)
{
    private const string CreateItemToolName = "TASK_BOARD_ITEM_CREATE";

    /// <summary>
    /// Reserved <c>assigneeId</c> the Studio's own Task Manager agent (a Studio Pack
    /// virtual MCP, id <c>studio-task-manager_{org}</c>) uses to delegate a task board
    /// item to the Super Agent — confirmed by reading that agent's instructions via
    /// <c>COLLECTION_VIRTUAL_MCP_LIST</c>: "Use the assignee id `super-agent` only when
    /// the user explicitly asks to delegate work to the Super Agent [...] that
    /// delegation always enters To Do and queues a run." It is a literal reserved
    /// string, not a member/user id — this org has no other member/agent to look up.
    /// </summary>
    public const string SuperAgentAssigneeId = "super-agent";

    public async Task<string> CreateItemAsync(
        string title,
        string? description,
        string? assigneeId,
        CancellationToken cancellationToken = default)
    {
        var arguments = BuildCreateItemArguments(title, description, assigneeId);

        using var httpClient = httpClientFactory.CreateClient();
        var transport = new HttpClientTransport(
            new HttpClientTransportOptions
            {
                Endpoint = endpoint,
                TransportMode = HttpTransportMode.StreamableHttp,
                AdditionalHeaders = new Dictionary<string, string>
                {
                    ["Authorization"] = $"Bearer {apiKey}",
                },
            },
            httpClient,
            ownsHttpClient: false);

        CallToolResult result;
        try
        {
            await using var client = await McpClient.CreateAsync(transport, cancellationToken: cancellationToken);
            result = await client.CallToolAsync(CreateItemToolName, arguments, cancellationToken: cancellationToken);
        }
        catch (McpException ex)
        {
            throw new StudioTaskBoardException($"Falha ao chamar {CreateItemToolName} no MCP da Studio: {ex.Message}");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new StudioTaskBoardException($"O MCP da Studio parece estar fora do ar: {ex.Message}");
        }

        var text = result.Content.OfType<TextContentBlock>().FirstOrDefault()?.Text;
        if (result.IsError is true)
        {
            throw new StudioTaskBoardException(
                $"A Studio recusou a criação do item no Task Board: {text ?? "erro desconhecido"}");
        }

        return text ?? result.StructuredContent?.ToString() ?? string.Empty;
    }

    /// <summary>
    /// Builds the <c>TASK_BOARD_ITEM_CREATE</c> call's <c>arguments</c> payload.
    /// Pulled out of <see cref="CreateItemAsync"/> as its own testable step (that
    /// method calls it directly, not a reimplementation) because the MCP call itself
    /// — a real JSON-RPC-over-Streamable-HTTP session — isn't practical to fake in a
    /// unit test; this is the seam that lets a test assert what actually gets sent
    /// (ticket 05, criterion 4: the assignee field goes in the payload).
    /// </summary>
    internal static Dictionary<string, object?> BuildCreateItemArguments(
        string title,
        string? description,
        string? assigneeId)
    {
        var arguments = new Dictionary<string, object?> { ["title"] = title };
        if (!string.IsNullOrWhiteSpace(description))
        {
            arguments["description"] = description;
        }

        if (!string.IsNullOrWhiteSpace(assigneeId))
        {
            arguments["assigneeId"] = assigneeId;
        }

        return arguments;
    }
}

/// <summary>
/// Raised for any failure calling the Studio's Task Board MCP tool — a protocol/tool
/// level error, or the underlying HTTP transport being unreachable.
/// </summary>
public class StudioTaskBoardException(string message) : Exception(message);
