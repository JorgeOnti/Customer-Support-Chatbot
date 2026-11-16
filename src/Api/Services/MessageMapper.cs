using System.Text.Json;
using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Models;

namespace ForkAndFlame.SupportApi.Services;

/// <summary>
/// Shared projection helpers for mapping EF entities to API DTOs consistently across controllers.
/// </summary>
public static class MessageMapper
{
    public static Dictionary<string, KnowledgeEntry> BuildEntriesLookup(
        IEnumerable<KnowledgeEntry> entries)
    {
        return entries
            .GroupBy(e => e.Title.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
    }

    public static IReadOnlyList<ChatMessageDto> MapMessages(
        IEnumerable<ChatMessage> messages,
        IReadOnlyDictionary<string, KnowledgeEntry> entriesByTitle)
    {
        return messages
            .OrderBy(m => m.CreatedAt)
            .ThenBy(m => m.Id)
            .Select(m => MapMessage(m, entriesByTitle))
            .ToList();
    }

    public static ChatMessageDto MapMessage(
        ChatMessage message,
        IReadOnlyDictionary<string, KnowledgeEntry> entriesByTitle)
    {
        var sources = ResolveSources(message.SourceTitlesJson, entriesByTitle);
        return new ChatMessageDto(
            message.Id,
            message.Role,
            message.Content,
            message.CreatedAt,
            message.TokensUsed,
            sources);
    }

    public static SupportTicketDto MapTicket(
        SupportTicket ticket,
        Conversation conversation,
        IReadOnlyDictionary<string, KnowledgeEntry> entriesByTitle)
    {
        var messages = MapMessages(conversation.Messages, entriesByTitle);
        return new SupportTicketDto(
            ticket.Id,
            ticket.ConversationId,
            conversation.SessionId,
            conversation.CustomerName,
            ticket.Status,
            ticket.Summary,
            ticket.CreatedAt,
            messages.Count,
            messages);
    }

    private static IReadOnlyList<SourceReferenceDto> ResolveSources(
        string? sourceTitlesJson,
        IReadOnlyDictionary<string, KnowledgeEntry> entriesByTitle)
    {
        if (string.IsNullOrWhiteSpace(sourceTitlesJson))
        {
            return Array.Empty<SourceReferenceDto>();
        }

        List<string>? titles;
        try
        {
            titles = JsonSerializer.Deserialize<List<string>>(sourceTitlesJson);
        }
        catch (JsonException)
        {
            return Array.Empty<SourceReferenceDto>();
        }

        if (titles is null || titles.Count == 0)
        {
            return Array.Empty<SourceReferenceDto>();
        }

        var result = new List<SourceReferenceDto>();
        foreach (var title in titles)
        {
            if (string.IsNullOrWhiteSpace(title))
            {
                continue;
            }

            if (entriesByTitle.TryGetValue(title.Trim(), out var entry))
            {
                result.Add(new SourceReferenceDto(entry.Id, entry.Title, entry.Category));
            }
            else
            {
                result.Add(new SourceReferenceDto(0, title.Trim(), "Knowledge Base"));
            }
        }

        return result;
    }
}
