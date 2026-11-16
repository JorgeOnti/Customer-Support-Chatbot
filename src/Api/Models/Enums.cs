namespace ForkAndFlame.SupportApi.Models;

/// <summary>
/// Identifies who authored a message in a support conversation.
/// </summary>
public enum MessageRole
{
    User,
    Assistant
}

/// <summary>
/// Tracks the lifecycle state of a customer support escalation ticket.
/// </summary>
public enum TicketStatus
{
    Open,
    InProgress,
    Resolved
}
