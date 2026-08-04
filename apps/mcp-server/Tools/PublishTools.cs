using System.ComponentModel;
using System.Text;
using McpServer.Infrastructure;
using ModelContextProtocol;
using ModelContextProtocol.Server;

namespace McpServer.Tools;

[McpServerToolType]
public class PublishTools(StudioTaskBoardClient studioTaskBoardClient)
{
    [McpServerTool]
    [Description("Publica uma sugestão de conteúdo GEO (ex: output de generate_optimized_content) como item de aprovação humana no Task Board da Studio (TASK_BOARD_ITEM_CREATE) — nunca aplica a mudança direto na loja. Um Super Agent da Studio transforma o item num PR real contra o storefront; aprovação (TASK_BOARD_REVIEW_DECISION) e promoção a produção (TASK_BOARD_PROMOTE_TO_PRODUCTION) ficam fora desta tool, por design (ver ADR 0004).")]
    public async Task<PublishSuggestionResult> PublishSuggestion(
        [Description("Handle (slug) ou ID do produto na Shopify ao qual a sugestão se refere — usado só para compor o título/descrição do item no Task Board, não é enviado à Shopify por esta tool.")]
        string productIdentifier,
        [Description("Resultado de generate_optimized_content (ticket 05): descrição otimizada e JSON-LD de Product/FAQPage a incluir no item de aprovação.")]
        ContentGenerationResult suggestion,
        [Description("Contexto adicional para o revisor humano no Task Board (ex: por que a mudança foi sugerida). Opcional.")]
        string? reviewNotes = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(productIdentifier))
        {
            throw new McpException("O identificador do produto (handle ou ID) não pode ser vazio.");
        }

        ArgumentNullException.ThrowIfNull(suggestion);

        var title = $"[GEO] Otimizar conteúdo da PDP {productIdentifier}";
        var description = BuildItemDescription(productIdentifier, suggestion, reviewNotes);

        string taskBoardResponse;
        try
        {
            taskBoardResponse = await studioTaskBoardClient.CreateItemAsync(
                title, description, StudioTaskBoardClient.SuperAgentAssigneeId, cancellationToken);
        }
        catch (StudioTaskBoardException ex)
        {
            throw new McpException($"Não foi possível criar o item no Task Board da Studio: {ex.Message}");
        }

        return new PublishSuggestionResult(productIdentifier, title, taskBoardResponse);
    }

    private static string BuildItemDescription(
        string productIdentifier,
        ContentGenerationResult suggestion,
        string? reviewNotes)
    {
        var body = new StringBuilder();
        body.AppendLine("Sugestão de conteúdo GEO gerada automaticamente — requer aprovação humana antes de virar publicação.");
        body.AppendLine();
        body.AppendLine($"**Produto:** {productIdentifier}");

        if (!string.IsNullOrWhiteSpace(reviewNotes))
        {
            body.AppendLine();
            body.AppendLine($"**Notas para o revisor:** {reviewNotes}");
        }

        body.AppendLine();
        body.AppendLine("**Descrição otimizada:**");
        body.AppendLine(suggestion.OptimizedCatalog.DescriptionHtml);

        body.AppendLine();
        body.AppendLine("**schema.org Product (JSON-LD):**");
        body.AppendLine("```json");
        body.AppendLine(suggestion.SchemaOrgProductJsonLd);
        body.AppendLine("```");

        if (suggestion.SchemaOrgFaqPageJsonLd is not null)
        {
            body.AppendLine();
            body.AppendLine("**schema.org FAQPage (JSON-LD):**");
            body.AppendLine("```json");
            body.AppendLine(suggestion.SchemaOrgFaqPageJsonLd);
            body.AppendLine("```");
        }

        return body.ToString();
    }
}

/// <summary>
/// Output of <c>publish_suggestion</c>. <see cref="TaskBoardResponse"/> is the raw
/// text/structured-content the Studio's <c>TASK_BOARD_ITEM_CREATE</c> tool returned
/// (item id/status, shape not asserted here — passed through as-is).
/// </summary>
public record PublishSuggestionResult(string ProductIdentifier, string TaskBoardItemTitle, string TaskBoardResponse);
