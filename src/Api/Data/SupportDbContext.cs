using ForkAndFlame.SupportApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ForkAndFlame.SupportApi.Data;

/// <summary>
/// Entity Framework Core database context for the Fork & Flame support system.
/// </summary>
public class SupportDbContext : DbContext
{
    public SupportDbContext(DbContextOptions<SupportDbContext> options)
        : base(options)
    {
    }

    public DbSet<KnowledgeEntry> KnowledgeEntries => Set<KnowledgeEntry>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<KnowledgeEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Category).IsRequired().HasMaxLength(100);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.HasIndex(e => new { e.Category, e.Title });
        });

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.SessionId).IsRequired().HasMaxLength(128);
            entity.HasIndex(c => c.SessionId).IsUnique();
            entity.Property(c => c.CustomerName).HasMaxLength(120);
            entity.Property(c => c.StartedAt).IsRequired();

            entity.HasMany(c => c.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(c => c.Tickets)
                .WithOne(t => t.Conversation)
                .HasForeignKey(t => t.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Role)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();
            entity.Property(m => m.Content).IsRequired();
            entity.Property(m => m.CreatedAt).IsRequired();
            entity.HasIndex(m => new { m.ConversationId, m.CreatedAt });
        });

        modelBuilder.Entity<SupportTicket>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Status)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();
            entity.Property(t => t.Summary).IsRequired();
            entity.Property(t => t.CreatedAt).IsRequired();
            entity.HasIndex(t => new { t.Status, t.CreatedAt });
        });
    }
}
