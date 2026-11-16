using System.Text.Json;
using ForkAndFlame.SupportApi.Data;
using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Models;
using ForkAndFlame.SupportApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace ForkAndFlame.SupportApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private static readonly string[] HumanHandoffPhrases =
    [
        "talk to a human",
        "speak to a human",
        "speak with a human",
        "human agent",
        "real person",
        "talk to a manager",
        "speak to a manager",
        "speak with a manager",
        "talk to someone",
        "speak to someone",
        "customer service representative",
        "escalate"
    ];

    private readonly SupportDbContext _db;
    private readonly IKnowledgeRetrievalService _retrievalService;
    private readonly IOpenAiChatService _openAiChatService;

    public ChatController(
        SupportDbContext db,
        IKnowledgeRetrievalService retrievalService,
        IOpenAiChatService openAiChatService)
    {
        _db = db;
        _retrievalService = retrievalService;
        _openAiChatService = openAiChatService;
    }

    [HttpPost]
    public async Task<ActionResult<ChatResponse>> PostMessage(
        [FromBody] ChatRequest request,
        CancellationToken cancellationToken)
    {
        var sessionId = request.SessionId.Trim();
        var userText = request.Message.Trim();

        if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(userText))
        {
            return BadRequest(new
            {
                error = "Both sessionId and message are required.",
                message = "Both sessionId and message are required.",
                code = "VALIDATION_ERROR"
            });
        }

        if (!_openAiChatService.IsConfigured())
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                error = "OpenAI API key is not configured.",
                message = "The OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable or run 'dotnet user-secrets set \"OpenAI:ApiKey\" \"sk-...\"' in src/Api.",
                code = "OPENAI_API_KEY_MISSING"
            });
        }

        var conversation = await _db.Conversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.SessionId == sessionId, cancellationToken);

        if (conversation is null)
        {
            conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? null : request.CustomerName.Trim(),
                StartedAt = DateTime.UtcNow
            };
            _db.Conversations.Add(conversation);
        }
        else if (!string.IsNullOrWhiteSpace(request.CustomerName))
        {
            conversation.CustomerName = request.CustomerName.Trim();
        }

        var priorMessages = conversation.Messages
            .OrderBy(m => m.CreatedAt)
            .ThenBy(m => m.Id)
            .ToList();

        var retrievedEntries = await _retrievalService.RetrieveRelevantEntriesAsync(
            userText,
            maxResults: 5,
            cancellationToken);

        var wantsHuman = IsExplicitHumanHandoffRequest(userText);

        string reply;
        IReadOnlyList<SourceReferenceDto> validatedSources;
        bool offerHandoff;
        int tokensUsed;

        if (retrievedEntries.Count == 0)
        {
            reply = wantsHuman
                ? "I'd be happy to connect you with a member of the Fork & Flame team. Please click \"Talk to a Human\" below to open a support ticket with your conversation transcript."
                : "I don't have information about that in our restaurant knowledge base. Would you like me to connect you with a member of the Fork & Flame team who can help?";
            validatedSources = Array.Empty<SourceReferenceDto>();
            offerHandoff = true;
            tokensUsed = 0;
        }
        else
        {
            GroundedChatCompletionResult completion;
            try
            {
                completion = await _openAiChatService.GenerateGroundedReplyAsync(
                    userText,
                    priorMessages,
                    retrievedEntries,
                    cancellationToken);
            }
            catch (OpenAiApiException ex)
            {
                return StatusCode(ex.StatusCode, new
                {
                    error = ex.Message,
                    message = ex.Message,
                    code = "OPENAI_API_ERROR"
                });
            }

            reply = completion.Reply;
            validatedSources = completion.ValidatedSources;
            offerHandoff = completion.NeedsHumanHandoff || wantsHuman;
            tokensUsed = completion.TokensUsed;
        }

        var userTimestamp = DateTime.UtcNow;
        var assistantTimestamp = userTimestamp.AddMilliseconds(1);

        var userMessageEntity = new ChatMessage
        {
            ConversationId = conversation.Id,
            Role = MessageRole.User,
            Content = userText,
            CreatedAt = userTimestamp
        };

        var sourceTitles = validatedSources.Select(s => s.Title).ToList();
        var assistantMessageEntity = new ChatMessage
        {
            ConversationId = conversation.Id,
            Role = MessageRole.Assistant,
            Content = reply,
            CreatedAt = assistantTimestamp,
            TokensUsed = tokensUsed,
            SourceTitlesJson = sourceTitles.Count > 0 ? JsonSerializer.Serialize(sourceTitles) : null
        };

        _db.ChatMessages.AddRange(userMessageEntity, assistantMessageEntity);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new ChatResponse(
            reply,
            validatedSources,
            offerHandoff,
            tokensUsed,
            assistantTimestamp));
    }

    [HttpGet("{sessionId}")]
    public async Task<ActionResult<ChatSessionResponse>> GetSession(
        string sessionId,
        CancellationToken cancellationToken)
    {
        var trimmedSessionId = sessionId.Trim();
        var conversation = await _db.Conversations
            .AsNoTracking()
            .Include(c => c.Messages)
            .Include(c => c.Tickets)
            .FirstOrDefaultAsync(c => c.SessionId == trimmedSessionId, cancellationToken);

        if (conversation is null)
        {
            return Ok(new ChatSessionResponse(
                null,
                trimmedSessionId,
                null,
                null,
                Array.Empty<ChatMessageDto>(),
                null));
        }

        var entries = await _db.KnowledgeEntries.AsNoTracking().ToListAsync(cancellationToken);
        var entriesByTitle = MessageMapper.BuildEntriesLookup(entries);

        var messages = MessageMapper.MapMessages(conversation.Messages, entriesByTitle);
        var latestTicket = conversation.Tickets
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefault();

        var activeTicketDto = latestTicket is null
            ? null
            : MessageMapper.MapTicket(latestTicket, conversation, entriesByTitle);

        return Ok(new ChatSessionResponse(
            conversation.Id,
            conversation.SessionId,
            conversation.CustomerName,
            conversation.StartedAt,
            messages,
            activeTicketDto));
    }

    [HttpPost("{sessionId}/escalate")]
    public async Task<ActionResult<EscalateChatResponse>> Escalate(
        string sessionId,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] EscalateChatRequest? request,
        CancellationToken cancellationToken)
    {
        var trimmedSessionId = sessionId.Trim();
        if (string.IsNullOrWhiteSpace(trimmedSessionId))
        {
            return BadRequest(new { error = "A valid sessionId is required." });
        }

        var conversation = await _db.Conversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.SessionId == trimmedSessionId, cancellationToken);

        if (conversation is null)
        {
            conversation = new Conversation
            {
                Id = Guid.NewGuid(),
                SessionId = trimmedSessionId,
                CustomerName = string.IsNullOrWhiteSpace(request?.CustomerName) ? null : request.CustomerName.Trim(),
                StartedAt = DateTime.UtcNow
            };
            _db.Conversations.Add(conversation);
        }
        else if (!string.IsNullOrWhiteSpace(request?.CustomerName))
        {
            conversation.CustomerName = request.CustomerName.Trim();
        }

        var summary = BuildTicketSummary(request?.Reason, conversation.Messages);

        var ticket = new SupportTicket
        {
            ConversationId = conversation.Id,
            Status = TicketStatus.Open,
            Summary = summary,
            CreatedAt = DateTime.UtcNow
        };

        _db.SupportTickets.Add(ticket);
        await _db.SaveChangesAsync(cancellationToken);

        var confirmationText =
            $"I've created Support Ticket #{ticket.Id} with your conversation transcript. A member of the Fork & Flame team will follow up with you shortly.";

        var confirmationEntity = new ChatMessage
        {
            ConversationId = conversation.Id,
            Role = MessageRole.Assistant,
            Content = confirmationText,
            CreatedAt = DateTime.UtcNow,
            TokensUsed = 0
        };

        _db.ChatMessages.Add(confirmationEntity);
        await _db.SaveChangesAsync(cancellationToken);

        // Reload messages including the newly saved confirmation for accurate ticket message count.
        var entries = await _db.KnowledgeEntries.AsNoTracking().ToListAsync(cancellationToken);
        var entriesByTitle = MessageMapper.BuildEntriesLookup(entries);

        var ticketDto = MessageMapper.MapTicket(ticket, conversation, entriesByTitle);
        var confirmationDto = MessageMapper.MapMessage(confirmationEntity, entriesByTitle);

        return Created($"/api/tickets/{ticket.Id}", new EscalateChatResponse(ticketDto, confirmationDto));
    }

    private static string BuildTicketSummary(string? explicitReason, IEnumerable<ChatMessage> messages)
    {
        if (!string.IsNullOrWhiteSpace(explicitReason))
        {
            return explicitReason.Trim();
        }

        var recentUserQuestions = messages
            .Where(m => m.Role == MessageRole.User)
            .OrderByDescending(m => m.CreatedAt)
            .Take(2)
            .Select(m => m.Content.Trim())
            .Reverse()
            .ToList();

        if (recentUserQuestions.Count == 0)
        {
            return "Customer requested human support via the Fork & Flame chat widget.";
        }

        var combined = string.Join(" | ", recentUserQuestions);
        return combined.Length <= 240 ? combined : $"{combined[..237]}...";
    }

    private static bool IsExplicitHumanHandoffRequest(string message)
    {
        var lower = message.ToLowerInvariant();
        return HumanHandoffPhrases.Any(phrase => lower.Contains(phrase, StringComparison.Ordinal));
    }
}
