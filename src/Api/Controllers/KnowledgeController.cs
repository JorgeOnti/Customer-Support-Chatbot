using ForkAndFlame.SupportApi.Data;
using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ForkAndFlame.SupportApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class KnowledgeController : ControllerBase
{
    private readonly SupportDbContext _db;

    public KnowledgeController(SupportDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<KnowledgeEntryDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? category,
        CancellationToken cancellationToken)
    {
        var query = _db.KnowledgeEntries.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(category) &&
            !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            var trimmedCategory = category.Trim();
            query = query.Where(k => k.Category == trimmedCategory);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(k =>
                k.Title.ToLower().Contains(term) ||
                k.Content.ToLower().Contains(term) ||
                k.Category.ToLower().Contains(term));
        }

        var items = await query
            .OrderBy(k => k.Category)
            .ThenBy(k => k.Title)
            .Select(k => new KnowledgeEntryDto(
                k.Id,
                k.Title,
                k.Content,
                k.Category,
                k.IsActive,
                k.UpdatedAt))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<KnowledgeEntryDto>> Create(
        [FromBody] CreateKnowledgeEntryRequest request,
        CancellationToken cancellationToken)
    {
        var entry = new KnowledgeEntry
        {
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            Category = request.Category.Trim(),
            IsActive = request.IsActive,
            UpdatedAt = DateTime.UtcNow
        };

        _db.KnowledgeEntries.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        var dto = MapToDto(entry);
        return CreatedAtAction(nameof(GetAll), new { id = entry.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<KnowledgeEntryDto>> Update(
        int id,
        [FromBody] UpdateKnowledgeEntryRequest request,
        CancellationToken cancellationToken)
    {
        var entry = await _db.KnowledgeEntries.FindAsync([id], cancellationToken);
        if (entry is null)
        {
            return NotFound(new { error = $"Knowledge entry #{id} was not found." });
        }

        entry.Title = request.Title.Trim();
        entry.Content = request.Content.Trim();
        entry.Category = request.Category.Trim();
        entry.IsActive = request.IsActive;
        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return Ok(MapToDto(entry));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var entry = await _db.KnowledgeEntries.FindAsync([id], cancellationToken);
        if (entry is null)
        {
            return NotFound(new { error = $"Knowledge entry #{id} was not found." });
        }

        _db.KnowledgeEntries.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static KnowledgeEntryDto MapToDto(KnowledgeEntry entry) =>
        new(entry.Id, entry.Title, entry.Content, entry.Category, entry.IsActive, entry.UpdatedAt);
}
