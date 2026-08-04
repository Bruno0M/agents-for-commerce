using McpServer.Infrastructure;

namespace McpServer.Tests.Infrastructure;

/// <summary>
/// Proves the ticket 05 fix through the exact payload-building code
/// <see cref="StudioTaskBoardClient.CreateItemAsync"/> uses before calling
/// <c>TASK_BOARD_ITEM_CREATE</c> — not a reimplementation of it. Before this ticket,
/// <c>CreateItemAsync</c> took only <c>title</c>/<c>description</c> and built an
/// <c>arguments</c> dictionary with no <c>assigneeId</c> key at all; there was no
/// third parameter to pass one through, so this test cannot even be expressed
/// against the old signature — it fails to compile there. That missing field is the
/// root cause the ticket describes: an item created without an assignee stays in
/// <c>triage</c> forever instead of being picked up by the Super Agent (ADR 0004).
///
/// <see cref="StudioTaskBoardClient.CreateItemAsync"/> itself isn't exercised here —
/// it opens a real JSON-RPC-over-Streamable-HTTP MCP session, which isn't practical
/// to fake in a unit test — so this targets the
/// <see cref="StudioTaskBoardClient.BuildCreateItemArguments"/> seam it delegates to,
/// which *is* the literal <c>arguments</c> object handed to <c>CallToolAsync</c>.
/// </summary>
public class StudioTaskBoardClientTests
{
    [Fact]
    public void BuildCreateItemArguments_WithAssigneeId_IncludesAssigneeIdInPayload()
    {
        var arguments = StudioTaskBoardClient.BuildCreateItemArguments(
            title: "[GEO] Otimizar conteúdo da PDP some-handle",
            description: "Sugestão de conteúdo GEO gerada automaticamente.",
            assigneeId: StudioTaskBoardClient.SuperAgentAssigneeId);

        Assert.True(arguments.ContainsKey("assigneeId"));
        Assert.Equal("super-agent", arguments["assigneeId"]);
    }

    [Fact]
    public void PublishSuggestion_UsesTheReservedSuperAgentAssigneeId()
    {
        // Ties the reserved constant PublishTools passes to CreateItemAsync to the
        // literal string the Studio's own Task Manager agent documents as the
        // Super Agent delegation id (confirmed live via COLLECTION_VIRTUAL_MCP_LIST
        // against the org's studio-task-manager agent instructions) — so a future
        // rename of the constant's value would be caught here, not just at the
        // call site.
        Assert.Equal("super-agent", StudioTaskBoardClient.SuperAgentAssigneeId);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void BuildCreateItemArguments_WithoutAssigneeId_OmitsAssigneeIdKey(string? assigneeId)
    {
        var arguments = StudioTaskBoardClient.BuildCreateItemArguments(
            title: "Título qualquer",
            description: "Descrição qualquer",
            assigneeId: assigneeId);

        Assert.False(arguments.ContainsKey("assigneeId"));
    }

    [Fact]
    public void BuildCreateItemArguments_AlwaysIncludesTitleAndDescriptionAlongsideAssignee()
    {
        var arguments = StudioTaskBoardClient.BuildCreateItemArguments(
            title: "Título",
            description: "Descrição",
            assigneeId: StudioTaskBoardClient.SuperAgentAssigneeId);

        Assert.Equal("Título", arguments["title"]);
        Assert.Equal("Descrição", arguments["description"]);
        Assert.Equal("super-agent", arguments["assigneeId"]);
    }
}
