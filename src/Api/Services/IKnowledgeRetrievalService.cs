using ForkAndFlame.SupportApi.Models;

namespace ForkAndFlame.SupportApi.Services;

/// <summary>
/// Retrieves the most relevant active knowledge base entries for a customer query.
/// </summary>
public interface IKnowledgeRetrievalService
{
    Task<IReadOnlyList<KnowledgeEntry>> RetrieveRelevantEntriesAsync(
        string query,
        int maxResults = 5,
        CancellationToken cancellationToken = default);
}
