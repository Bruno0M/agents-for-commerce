using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace McpServer.Infrastructure;

/// <summary>
/// Thin client for the Deco AI Gateway completion endpoint used by the org
/// (<c>bruno-feijoada</c>). Confirmed live against the real endpoint (2026-08-03):
/// it is <c>POST https://studio.decocms.com/api/{org}/v1/chat/completions</c> — a
/// Studio-hosted, OpenAI-compatible proxy (see decocms/studio,
/// apps/api/src/api/routes/openai-compat.ts), not a direct call to the
/// underlying model vendor. Auth is a Studio API key (created via the
/// management API/tools), not the AI Gateway's own managed provider key —
/// that key lives encrypted in the Studio vault and is never returned by any
/// API or UI, by design (see Studio docs, "AI Providers").
///
/// Model IDs use the "provider/model" shape (e.g. "anthropic/claude-sonnet-5").
/// Prefixing with "credential_id:" selects a specific AI provider key; without
/// it, the request routes to the org's default (first) configured key — the
/// Deco AI Gateway key in this org's case.
/// </summary>
public class AiGatewayClient(HttpClient httpClient)
{
    // The Gateway's request schema uses Zod .optional() (absent), not .nullable() —
    // sending "max_tokens": null explicitly (System.Text.Json's default) is a 400,
    // confirmed live. Omit unset optional fields instead of nulling them.
    private static readonly JsonSerializerOptions RequestJsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<AiGatewayCompletionResult> CompleteAsync(
        string model,
        IReadOnlyList<AiGatewayMessage> messages,
        int? maxTokens = null,
        double? temperature = null,
        CancellationToken cancellationToken = default)
    {
        var request = new AiGatewayCompletionRequest(model, messages, maxTokens, temperature);

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync("v1/chat/completions", request, RequestJsonOptions, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            throw new AiGatewayException(
                $"Could not reach the AI Gateway: {ex.Message}",
                errorType: "network_error",
                statusCode: null);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                throw await BuildExceptionAsync(response, cancellationToken);
            }

            AiGatewayCompletionResponse? completion;
            try
            {
                completion = await response.Content.ReadFromJsonAsync<AiGatewayCompletionResponse>(cancellationToken);
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                throw new AiGatewayException(
                    $"AI Gateway returned a 2xx response with an unparseable body: {ex.Message}",
                    errorType: "invalid_response",
                    statusCode: (int)response.StatusCode);
            }

            var choice = completion?.Choices?.FirstOrDefault();
            if (choice?.Message is null)
            {
                throw new AiGatewayException(
                    "AI Gateway returned a response with no completion choices.",
                    errorType: "empty_response",
                    statusCode: (int)response.StatusCode);
            }

            return new AiGatewayCompletionResult(choice.Message.Content ?? string.Empty, completion!.Usage);
        }
    }

    private static async Task<AiGatewayException> BuildExceptionAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        // Same {"error": {message, type, param, code}} envelope for every non-2xx
        // status this endpoint returns — 400 (bad request/model), 401 (invalid key),
        // 403 (org mismatch), 404 (unknown credential), 429 (rate limit), 5xx (upstream
        // model failure) — confirmed for 400/401 against the live endpoint.
        AiGatewayErrorEnvelope? envelope = null;
        try
        {
            envelope = await response.Content.ReadFromJsonAsync<AiGatewayErrorEnvelope>(cancellationToken);
        }
        catch (Exception ex) when (ex is JsonException or NotSupportedException)
        {
            // Body wasn't the expected error envelope (e.g. an upstream proxy's HTML
            // error page) — fall through to the generic message below.
        }

        var message = envelope?.Error?.Message ?? $"AI Gateway request failed with status {(int)response.StatusCode}.";
        return new AiGatewayException(message, envelope?.Error?.Type, (int)response.StatusCode);
    }
}

public record AiGatewayMessage(
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("content")] string Content);

/// <summary>
/// Which model (in the Gateway's "provider/model" shape, e.g. "anthropic/claude-sonnet-5")
/// the content-generation and buyer-agent-simulator tools call by default.
/// </summary>
public record AiGatewayOptions(string Model);

public record AiGatewayCompletionResult(string Content, AiGatewayUsage? Usage);

/// <summary>
/// Raised for any AI Gateway failure — a non-2xx response or a network-level
/// failure reaching it. <see cref="StatusCode"/> is null for the latter.
/// </summary>
public class AiGatewayException(string message, string? errorType, int? statusCode) : Exception(message)
{
    public string? ErrorType { get; } = errorType;

    public int? StatusCode { get; } = statusCode;
}

internal record AiGatewayCompletionRequest(
    [property: JsonPropertyName("model")] string Model,
    [property: JsonPropertyName("messages")] IReadOnlyList<AiGatewayMessage> Messages,
    [property: JsonPropertyName("max_tokens")] int? MaxTokens,
    [property: JsonPropertyName("temperature")] double? Temperature);

internal record AiGatewayCompletionResponse(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("model")] string Model,
    [property: JsonPropertyName("choices")] IReadOnlyList<AiGatewayChoice> Choices,
    [property: JsonPropertyName("usage")] AiGatewayUsage? Usage);

internal record AiGatewayChoice(
    [property: JsonPropertyName("message")] AiGatewayResponseMessage? Message,
    [property: JsonPropertyName("finish_reason")] string? FinishReason);

internal record AiGatewayResponseMessage(
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("content")] string? Content);

public record AiGatewayUsage(
    [property: JsonPropertyName("prompt_tokens")] int PromptTokens,
    [property: JsonPropertyName("completion_tokens")] int CompletionTokens,
    [property: JsonPropertyName("total_tokens")] int TotalTokens);

internal record AiGatewayErrorEnvelope(
    [property: JsonPropertyName("error")] AiGatewayErrorDetail? Error);

internal record AiGatewayErrorDetail(
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("param")] string? Param,
    [property: JsonPropertyName("code")] string? Code);
