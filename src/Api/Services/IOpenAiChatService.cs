using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Models;

namespace ForkAndFlame.SupportApi.Services;

public record GroundedChatCompletionResult(
    string Reply,
    IReadOnlyList<SourceReferenceDto> ValidatedSources,
    bool NeedsHumanHandoff,
    int TokensUsed);

/// <summary>
/// Exception raised when an upstream OpenAI API call fails cleanly without exposing credentials.
/// </summary>
public class OpenAiApiException : Exception
{
    public int StatusCode { get; }

    public OpenAiApiException(string message, int statusCode)
        : base(message)
    {
        StatusCode = statusCode;
    }
}

/// <summary>
/// Generates strictly grounded customer support answers via the OpenAI Chat Completions API.
/// </summary>
public interface IOpenAiChatService
{
    bool IsConfigured();

    Task<GroundedChatCompletionResult> GenerateGroundedReplyAsync(
        string userMessage,
        IReadOnlyList<ChatMessage> conversationHistory,
        IReadOnlyList<KnowledgeEntry> retrievedEntries,
        CancellationToken cancellationToken = default);
}
