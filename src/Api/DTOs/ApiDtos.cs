using System.ComponentModel.DataAnnotations;
using ForkAndFlame.SupportApi.Models;

namespace ForkAndFlame.SupportApi.DTOs;

public record KnowledgeEntryDto(
    int Id,
    string Title,
    string Content,
    string Category,
    bool IsActive,
    DateTime UpdatedAt);

public class CreateKnowledgeEntryRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

public class UpdateKnowledgeEntryRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}

public record SourceReferenceDto(
    int Id,
    string Title,
    string Category);

public class ChatRequest
{
    [Required]
    [MaxLength(128)]
    public string SessionId { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? CustomerName { get; set; }
}

public record ChatResponse(
    string Reply,
    IReadOnlyList<SourceReferenceDto> Sources,
    bool OfferHandoff,
    int TokensUsed,
    DateTime CreatedAt);

public record ChatMessageDto(
    int Id,
    MessageRole Role,
    string Content,
    DateTime CreatedAt,
    int? TokensUsed,
    IReadOnlyList<SourceReferenceDto> Sources);

public class EscalateChatRequest
{
    [MaxLength(120)]
    public string? CustomerName { get; set; }

    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public record SupportTicketDto(
    int Id,
    Guid ConversationId,
    string SessionId,
    string? CustomerName,
    TicketStatus Status,
    string Summary,
    DateTime CreatedAt,
    int MessageCount,
    IReadOnlyList<ChatMessageDto> Messages);

public record EscalateChatResponse(
    SupportTicketDto Ticket,
    ChatMessageDto ConfirmationMessage);

public record ChatSessionResponse(
    Guid? ConversationId,
    string SessionId,
    string? CustomerName,
    DateTime? StartedAt,
    IReadOnlyList<ChatMessageDto> Messages,
    SupportTicketDto? ActiveTicket);

public class UpdateTicketStatusRequest
{
    [Required]
    public TicketStatus Status { get; set; }
}

public record ConversationSummaryDto(
    Guid Id,
    string SessionId,
    string? CustomerName,
    DateTime StartedAt,
    DateTime LastActivityAt,
    int MessageCount,
    int TotalTokensUsed,
    bool HasTicket,
    int? LatestTicketId,
    TicketStatus? LatestTicketStatus,
    IReadOnlyList<ChatMessageDto> Messages);

public record HealthResponse(
    string Status,
    string Service,
    bool OpenAiConfigured,
    DateTime Timestamp);
