using ForkAndFlame.SupportApi.Data;
using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Models;
using ForkAndFlame.SupportApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForkAndFlame.SupportApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly SupportDbContext _db;

    public TicketsController(SupportDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SupportTicketDto>>> GetAll(
        [FromQuery] string? status,
        CancellationToken cancellationToken)
    {
        var query = _db.SupportTickets
            .AsNoTracking()
            .Include(t => t.Conversation!)
                .ThenInclude(c => c.Messages)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            !status.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            if (!Enum.TryParse<TicketStatus>(status.Trim(), ignoreCase: true, out var parsedStatus))
            {
                return BadRequest(new
                {
                    error = $"Invalid ticket status '{status}'. Allowed values: Open, InProgress, Resolved."
                });
            }

            query = query.Where(t => t.Status == parsedStatus);
        }

        var tickets = await query
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .ToListAsync(cancellationToken);

        var entries = await _db.KnowledgeEntries.AsNoTracking().ToListAsync(cancellationToken);
        var entriesByTitle = MessageMapper.BuildEntriesLookup(entries);

        var result = tickets
            .Where(t => t.Conversation is not null)
            .Select(t => MessageMapper.MapTicket(t, t.Conversation!, entriesByTitle))
            .ToList();

        return Ok(result);
    }

    [HttpPatch("{id:int}")]
    public async Task<ActionResult<SupportTicketDto>> UpdateStatus(
        int id,
        [FromBody] UpdateTicketStatusRequest request,
        CancellationToken cancellationToken)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.Conversation!)
                .ThenInclude(c => c.Messages)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (ticket is null || ticket.Conversation is null)
        {
            return NotFound(new { error = $"Support ticket #{id} was not found." });
        }

        ticket.Status = request.Status;
        await _db.SaveChangesAsync(cancellationToken);

        var entries = await _db.KnowledgeEntries.AsNoTracking().ToListAsync(cancellationToken);
        var entriesByTitle = MessageMapper.BuildEntriesLookup(entries);

        return Ok(MessageMapper.MapTicket(ticket, ticket.Conversation, entriesByTitle));
    }
}
