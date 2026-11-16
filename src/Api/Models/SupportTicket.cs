using System.ComponentModel.DataAnnotations;

namespace ForkAndFlame.SupportApi.Models;

/// <summary>
/// Represents a human-handoff support ticket escalated from a chat session.
/// </summary>
public class SupportTicket
{
    public int Id { get; set; }

    public Guid ConversationId { get; set; }

    public Conversation? Conversation { get; set; }

    public TicketStatus Status { get; set; } = TicketStatus.Open;

    [Required]
    public string Summary { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
