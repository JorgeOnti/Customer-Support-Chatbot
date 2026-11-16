using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Models;

namespace ForkAndFlame.SupportApi.Services;

/// <summary>
/// Typed HTTP client wrapper around OpenAI Chat Completions that enforces KB-only grounding and server-side source verification.
/// </summary>
public class OpenAiChatService : IOpenAiChatService
{
    private const int DefaultMaxTokens = 300;
    private const double DefaultTemperature = 0.2;
    private const string DefaultModel = "gpt-4o-mini";
    private const string DefaultBaseUrl = "https://api.openai.com/v1";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly HashSet<string> PlaceholderKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "YOUR_OPENAI_API_KEY",
        "sk-your-key-here",
        "sk-...",
        "replace-me"
    };

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<OpenAiChatService> _logger;

    public OpenAiChatService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OpenAiChatService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public bool IsConfigured()
    {
        var apiKey = ResolveApiKey();
        return !string.IsNullOrWhiteSpace(apiKey) && !PlaceholderKeys.Contains(apiKey.Trim());
    }

    public async Task<GroundedChatCompletionResult> GenerateGroundedReplyAsync(
        string userMessage,
        IReadOnlyList<ChatMessage> conversationHistory,
        IReadOnlyList<KnowledgeEntry> retrievedEntries,
        CancellationToken cancellationToken = default)
    {
        var apiKey = ResolveApiKey();
        if (string.IsNullOrWhiteSpace(apiKey) || PlaceholderKeys.Contains(apiKey.Trim()))
        {
            throw new OpenAiApiException(
                "OpenAI API key is not configured.",
                StatusCodes.Status503ServiceUnavailable);
        }

        var model = _configuration["OpenAI:Model"];
        if (string.IsNullOrWhiteSpace(model))
        {
            model = DefaultModel;
        }

        var maxTokens = _configuration.GetValue<int?>("OpenAI:MaxTokens") ?? DefaultMaxTokens;
        var temperature = _configuration.GetValue<double?>("OpenAI:Temperature") ?? DefaultTemperature;
        var baseUrl = _configuration["OpenAI:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = DefaultBaseUrl;
        }

        var messages = BuildPromptMessages(userMessage, conversationHistory, retrievedEntries);

        var requestPayload = new
        {
            model,
            max_tokens = maxTokens,
            temperature,
            response_format = new { type = "json_object" },
            messages
        };

        var endpoint = $"{baseUrl.TrimEnd('/')}/chat/completions";
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey.Trim());
        request.Content = new StringContent(
            JsonSerializer.Serialize(requestPayload),
            Encoding.UTF8,
            "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new OpenAiApiException(
                "The OpenAI request timed out. Please try again in a moment.",
                StatusCodes.Status504GatewayTimeout);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Network error while contacting OpenAI API endpoint.");
            throw new OpenAiApiException(
                "Unable to reach the OpenAI service right now. Please check network connectivity and try again.",
                StatusCodes.Status502BadGateway);
        }

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(
                "OpenAI API returned status code {StatusCode}.",
                (int)response.StatusCode);

            var errorDetail = ExtractOpenAiErrorMessage(responseBody)
                ?? $"OpenAI returned HTTP {(int)response.StatusCode}.";

            var mappedStatus = (int)response.StatusCode is 401 or 403
                ? StatusCodes.Status502BadGateway
                : (int)response.StatusCode;

            throw new OpenAiApiException(
                $"AI service request failed: {errorDetail}",
                mappedStatus);
        }

        OpenAiChatCompletionResponse? completion;
        try
        {
            completion = JsonSerializer.Deserialize<OpenAiChatCompletionResponse>(responseBody, JsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize OpenAI API completion envelope.");
            throw new OpenAiApiException(
                "Received an unexpected response format from the AI service.",
                StatusCodes.Status502BadGateway);
        }

        var rawContent = completion?.Choices?.FirstOrDefault()?.Message?.Content;
        if (string.IsNullOrWhiteSpace(rawContent))
        {
            throw new OpenAiApiException(
                "The AI service returned an empty response.",
                StatusCodes.Status502BadGateway);
        }

        var totalTokens = completion?.Usage?.TotalTokens ?? 0;
        var parsedPayload = ParseStructuredModelOutput(rawContent);

        var validatedSources = ValidateSources(parsedPayload.UsedSourceTitles, retrievedEntries);

        var reply = string.IsNullOrWhiteSpace(parsedPayload.Reply)
            ? "I don't have information about that in our restaurant knowledge base. Would you like me to connect you with a member of the Fork & Flame team?"
            : parsedPayload.Reply.Trim();

        return new GroundedChatCompletionResult(
            reply,
            validatedSources,
            parsedPayload.NeedsHumanHandoff,
            totalTokens);
    }

    private string? ResolveApiKey()
    {
        var configuredKey = _configuration["OpenAI:ApiKey"];
        if (!string.IsNullOrWhiteSpace(configuredKey))
        {
            return configuredKey;
        }

        return Environment.GetEnvironmentVariable("OPENAI_API_KEY");
    }

    private static List<object> BuildPromptMessages(
        string userMessage,
        IReadOnlyList<ChatMessage> conversationHistory,
        IReadOnlyList<KnowledgeEntry> retrievedEntries)
    {
        var contextBuilder = new StringBuilder();
        if (retrievedEntries.Count == 0)
        {
            contextBuilder.AppendLine("[NO MATCHING KNOWLEDGE BASE ENTRIES]");
        }
        else
        {
            foreach (var entry in retrievedEntries)
            {
                contextBuilder.AppendLine($"### Title: {entry.Title}");
                contextBuilder.AppendLine($"Category: {entry.Category}");
                contextBuilder.AppendLine($"Details: {entry.Content}");
                contextBuilder.AppendLine();
            }
        }

        var systemPrompt = $$"""
            You are the official customer support assistant for Fork & Flame restaurant. Answer customer questions using ONLY the facts provided in the KNOWLEDGE BASE CONTEXT below. Do NOT invent, estimate, or assume prices, hours, menu items, ingredients, delivery areas, or policies not explicitly stated in the context. If the answer is not present in the context, honestly state that you don't have that information and offer to connect them with a human team member.

            Respond strictly with a valid JSON object matching this exact schema:
            {
              "reply": "Your helpful, concise, friendly customer-facing answer grounded strictly in the knowledge base context.",
              "usedSourceTitles": ["Exact Title of KB Entry Used"],
              "needsHumanHandoff": false
            }

            Rules:
            - Only list exact Title values from the KNOWLEDGE BASE CONTEXT in "usedSourceTitles". If no entry directly answers the question, set "usedSourceTitles" to [].
            - Set "needsHumanHandoff" to true whenever the answer is not in the KNOWLEDGE BASE CONTEXT or the customer asks to speak with a human, staff member, or manager.
            - Keep "reply" concise, warm, and natural in plain English (no raw JSON or markdown code fences inside "reply").

            KNOWLEDGE BASE CONTEXT:
            {{contextBuilder.ToString().TrimEnd()}}
            """;

        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

        // Include up to the last 6 prior turns for multi-turn conversational continuity.
        foreach (var turn in conversationHistory.TakeLast(6))
        {
            messages.Add(new
            {
                role = turn.Role == MessageRole.User ? "user" : "assistant",
                content = turn.Content
            });
        }

        messages.Add(new { role = "user", content = userMessage });
        return messages;
    }

    private static IReadOnlyList<SourceReferenceDto> ValidateSources(
        IReadOnlyList<string>? usedSourceTitles,
        IReadOnlyList<KnowledgeEntry> retrievedEntries)
    {
        if (usedSourceTitles is null || usedSourceTitles.Count == 0 || retrievedEntries.Count == 0)
        {
            return Array.Empty<SourceReferenceDto>();
        }

        var retrievedByTitle = retrievedEntries.ToDictionary(
            e => e.Title.Trim(),
            e => e,
            StringComparer.OrdinalIgnoreCase);

        var validated = new List<SourceReferenceDto>();
        var seenIds = new HashSet<int>();

        foreach (var rawTitle in usedSourceTitles)
        {
            if (string.IsNullOrWhiteSpace(rawTitle))
            {
                continue;
            }

            if (retrievedByTitle.TryGetValue(rawTitle.Trim(), out var entry) && seenIds.Add(entry.Id))
            {
                validated.Add(new SourceReferenceDto(entry.Id, entry.Title, entry.Category));
            }
        }

        return validated;
    }

    private StructuredModelOutput ParseStructuredModelOutput(string rawContent)
    {
        var cleaned = rawContent.Trim();
        if (cleaned.StartsWith("```", StringComparison.Ordinal))
        {
            var firstBrace = cleaned.IndexOf('{');
            var lastBrace = cleaned.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace)
            {
                cleaned = cleaned[firstBrace..(lastBrace + 1)];
            }
        }

        try
        {
            var parsed = JsonSerializer.Deserialize<StructuredModelOutput>(cleaned, JsonOptions);
            if (parsed is not null)
            {
                return parsed;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Model output was not valid JSON; falling back to raw reply without source citations.");
        }

        return new StructuredModelOutput
        {
            Reply = rawContent.Trim(),
            UsedSourceTitles = [],
            NeedsHumanHandoff = false
        };
    }

    private static string? ExtractOpenAiErrorMessage(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            if (doc.RootElement.TryGetProperty("error", out var errorObj) &&
                errorObj.TryGetProperty("message", out var msgProp))
            {
                return msgProp.GetString();
            }
        }
        catch (JsonException)
        {
            // Ignore malformed error body.
        }

        return null;
    }

    private sealed class OpenAiChatCompletionResponse
    {
        public List<Choice>? Choices { get; set; }
        public UsageInfo? Usage { get; set; }
    }

    private sealed class Choice
    {
        public AssistantMessage? Message { get; set; }
    }

    private sealed class AssistantMessage
    {
        public string? Content { get; set; }
    }

    private sealed class UsageInfo
    {
        [JsonPropertyName("total_tokens")]
        public int TotalTokens { get; set; }
    }

    private sealed class StructuredModelOutput
    {
        public string? Reply { get; set; }
        public List<string>? UsedSourceTitles { get; set; }
        public bool NeedsHumanHandoff { get; set; }
    }
}
