using ForkAndFlame.SupportApi.DTOs;
using ForkAndFlame.SupportApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace ForkAndFlame.SupportApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IOpenAiChatService _openAiChatService;

    public HealthController(IOpenAiChatService openAiChatService)
    {
        _openAiChatService = openAiChatService;
    }

    [HttpGet]
    public ActionResult<HealthResponse> GetHealth()
    {
        return Ok(new HealthResponse(
            "Healthy",
            "ForkAndFlame.SupportApi",
            _openAiChatService.IsConfigured(),
            DateTime.UtcNow));
    }
}
