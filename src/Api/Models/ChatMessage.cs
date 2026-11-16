using System.ComponentModel.DataAnnotations;

namespace ForkAndFlame.SupportApi.Models;

/// <summary>
/// Represents an individual turn inside a customer support conversation.
/// </summary>
public class ChatMessage
{
    public int Id { get; set; }

    public Guid ConversationId { get; set; }

    public Conversation? Conversation { get; set; }

    public MessageRole Role { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? TokensUsed { get; set; }

    public string? SourceTitlesJson { get; set; }
}
