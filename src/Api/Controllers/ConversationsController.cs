using ForkAndFlame.SupportApi.Data;
using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForkAndFlame.SupportApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConversationsController : ControllerBase
{
    private readonly SupportDbContext _db;

    public ConversationsController(SupportDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ConversationSummaryDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var conversations = await _db.Conversations
            .AsNoTracking()
            .Include(c => c.Messages)
            .Include(c => c.Tickets)
            .ToListAsync(cancellationToken);

        var entries = await _db.KnowledgeEntries.AsNoTracking().ToListAsync(cancellationToken);
        var entriesByTitle = MessageMapper.BuildEntriesLookup(entries);

        var result = conversations
            .Select(c =>
            {
                var orderedMessages = MessageMapper.MapMessages(c.Messages, entriesByTitle);
                var lastActivity = orderedMessages.Count > 0
                    ? orderedMessages[^1].CreatedAt
                    : c.StartedAt;
                var totalTokens = c.Messages.Sum(m => m.TokensUsed ?? 0);
                var latestTicket = c.Tickets
                    .OrderByDescending(t => t.CreatedAt)
                    .FirstOrDefault();

                return new ConversationSummaryDto(
                    c.Id,
                    c.SessionId,
                    c.CustomerName,
                    c.StartedAt,
                    lastActivity,
                    orderedMessages.Count,
                    totalTokens,
                    latestTicket is not null,
                    latestTicket?.Id,
                    latestTicket?.Status,
                    orderedMessages);
            })
            .OrderByDescending(c => c.LastActivityAt)
            .ToList();

        return Ok(result);
    }
}
