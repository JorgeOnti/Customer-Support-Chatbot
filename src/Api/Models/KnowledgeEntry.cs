using System.ComponentModel.DataAnnotations;

namespace ForkAndFlame.SupportApi.Models;

/// <summary>
/// Represents a single authoritative knowledge base article used to ground chatbot replies.
/// </summary>
public class KnowledgeEntry
{
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
