using System.ComponentModel.DataAnnotations;

namespace ForkAndFlame.SupportApi.Models;

/// <summary>
/// Represents a customer support chat session tracked via browser localStorage session ID.
/// </summary>
public class Conversation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(128)]
    public string SessionId { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? CustomerName { get; set; }

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

    public ICollection<SupportTicket> Tickets { get; set; } = new List<SupportTicket>();
}
