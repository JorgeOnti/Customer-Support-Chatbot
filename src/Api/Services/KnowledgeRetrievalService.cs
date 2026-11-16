using System.Text.RegularExpressions;
using ForkAndFlame.SupportApi.Data;
using ForkAndFlame.SupportApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ForkAndFlame.SupportApi.Services;

/// <summary>
/// Scores active knowledge base entries using stopword-filtered keyword matching and lightweight stemming.
/// Returns an empty list when no entry exceeds the relevance threshold so out-of-scope queries short-circuit safely.
/// </summary>
public partial class KnowledgeRetrievalService : IKnowledgeRetrievalService
{
    private const double MinimumEntryScore = 2.0;
    private const double MinimumSpecificCoverageRatio = 0.34;

    private static readonly HashSet<string> Stopwords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "about", "an", "and", "any", "are", "as", "at", "be", "but", "by", "can",
        "could", "did", "do", "does", "for", "from", "get", "got", "had", "has", "have",
        "hello", "hey", "hi", "how", "i", "if", "in", "into", "is", "it", "its", "just",
        "like", "many", "may", "me", "more", "much", "my", "need", "no", "not", "of", "on",
        "or", "our", "out", "please", "should", "so", "some", "tell", "than", "that", "the",
        "their", "them", "there", "these", "they", "this", "those", "to", "us", "want",
        "was", "we", "were", "what", "when", "where", "which", "who", "why", "will",
        "with", "would", "you", "your"
    };

    private static readonly HashSet<string> GenericDomainWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "available", "cost", "detail", "dish", "flame", "food", "fork", "info",
        "information", "item", "menu", "offer", "option", "policy", "price",
        "pricing", "restaurant", "serve", "service"
    };

    private readonly SupportDbContext _db;

    public KnowledgeRetrievalService(SupportDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<KnowledgeEntry>> RetrieveRelevantEntriesAsync(
        string query,
        int maxResults = 5,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Array.Empty<KnowledgeEntry>();
        }

        var (specificTokens, genericTokens) = TokenizeQuery(query);
        if (specificTokens.Count == 0 && genericTokens.Count == 0)
        {
            return Array.Empty<KnowledgeEntry>();
        }

        var activeEntries = await _db.KnowledgeEntries
            .AsNoTracking()
            .Where(k => k.IsActive)
            .ToListAsync(cancellationToken);

        if (activeEntries.Count == 0)
        {
            return Array.Empty<KnowledgeEntry>();
        }

        // If a query only contains generic restaurant words (e.g., "What is on the menu?"),
        // evaluate those tokens directly; otherwise require matching specific topical tokens.
        var evaluateGenericOnly = specificTokens.Count == 0;
        var primaryTokens = evaluateGenericOnly ? genericTokens : specificTokens;

        var matchedSpecificTokensAcrossTopEntries = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var scoredEntries = new List<(KnowledgeEntry Entry, double Score, HashSet<string> MatchedTokens)>();

        foreach (var entry in activeEntries)
        {
            var titleTokens = TokenizeText(entry.Title);
            var categoryTokens = TokenizeText(entry.Category);
            var contentTokens = TokenizeText(entry.Content);

            double score = 0;
            var matchedTokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var token in primaryTokens)
            {
                var tokenScore = ScoreTokenAgainstEntry(token, titleTokens, categoryTokens, contentTokens);
                if (tokenScore > 0)
                {
                    score += tokenScore;
                    matchedTokens.Add(token);
                }
            }

            if (score <= 0)
            {
                continue;
            }

            if (!evaluateGenericOnly && genericTokens.Count > 0)
            {
                foreach (var genericToken in genericTokens)
                {
                    score += ScoreTokenAgainstEntry(genericToken, titleTokens, categoryTokens, contentTokens) * 0.25;
                }
            }

            if (score >= MinimumEntryScore)
            {
                scoredEntries.Add((entry, score, matchedTokens));
                foreach (var m in matchedTokens)
                {
                    matchedSpecificTokensAcrossTopEntries.Add(m);
                }
            }
        }

        if (scoredEntries.Count == 0)
        {
            return Array.Empty<KnowledgeEntry>();
        }

        if (!evaluateGenericOnly && primaryTokens.Count >= 2)
        {
            var coverage = (double)matchedSpecificTokensAcrossTopEntries.Count / primaryTokens.Count;
            if (coverage < MinimumSpecificCoverageRatio)
            {
                return Array.Empty<KnowledgeEntry>();
            }
        }

        return scoredEntries
            .OrderByDescending(item => item.Score)
            .ThenByDescending(item => item.MatchedTokens.Count)
            .ThenBy(item => item.Entry.Title)
            .Take(maxResults)
            .Select(item => item.Entry)
            .ToList();
    }

    private static double ScoreTokenAgainstEntry(
        string queryToken,
        List<string> titleTokens,
        List<string> categoryTokens,
        List<string> contentTokens)
    {
        double score = 0;

        if (ContainsExactOrStemMatch(titleTokens, queryToken, out var isExactTitle))
        {
            score += isExactTitle ? 3.5 : 2.2;
        }

        if (ContainsExactOrStemMatch(categoryTokens, queryToken, out var isExactCategory))
        {
            score += isExactCategory ? 2.0 : 1.2;
        }

        var contentMatches = CountMatches(contentTokens, queryToken, out var hasExactContent);
        if (contentMatches > 0)
        {
            score += hasExactContent ? 1.5 : 1.0;
            score += Math.Min(contentMatches - 1, 3) * 0.5;
        }

        return score;
    }

    private static bool ContainsExactOrStemMatch(List<string> targetTokens, string queryToken, out bool isExact)
    {
        isExact = false;
        var foundPrefix = false;

        foreach (var target in targetTokens)
        {
            if (target.Equals(queryToken, StringComparison.OrdinalIgnoreCase))
            {
                isExact = true;
                return true;
            }

            if (IsPrefixOrStemMatch(queryToken, target))
            {
                foundPrefix = true;
            }
        }

        return foundPrefix;
    }

    private static int CountMatches(List<string> targetTokens, string queryToken, out bool hasExact)
    {
        hasExact = false;
        var count = 0;

        foreach (var target in targetTokens)
        {
            if (target.Equals(queryToken, StringComparison.OrdinalIgnoreCase))
            {
                hasExact = true;
                count++;
            }
            else if (IsPrefixOrStemMatch(queryToken, target))
            {
                count++;
            }
        }

        return count;
    }

    private static bool IsPrefixOrStemMatch(string a, string b)
    {
        if (a.Length < 4 || b.Length < 4)
        {
            return false;
        }

        return a.StartsWith(b, StringComparison.OrdinalIgnoreCase) ||
               b.StartsWith(a, StringComparison.OrdinalIgnoreCase);
    }

    private static (List<string> SpecificTokens, List<string> GenericTokens) TokenizeQuery(string query)
    {
        var specific = new List<string>();
        var generic = new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var token in TokenizeText(query))
        {
            if (!seen.Add(token))
            {
                continue;
            }

            if (GenericDomainWords.Contains(token))
            {
                generic.Add(token);
            }
            else
            {
                specific.Add(token);
            }
        }

        return (specific, generic);
    }

    private static List<string> TokenizeText(string text)
    {
        var tokens = new List<string>();
        foreach (Match match in WordTokenRegex().Matches(text.ToLowerInvariant()))
        {
            var raw = match.Value;
            if (string.IsNullOrWhiteSpace(raw) || Stopwords.Contains(raw))
            {
                continue;
            }

            if (raw.Contains('-'))
            {
                var normalizedCompound = StemToken(raw);
                if (!string.IsNullOrWhiteSpace(normalizedCompound) && !Stopwords.Contains(normalizedCompound))
                {
                    tokens.Add(normalizedCompound);
                }

                foreach (var part in raw.Split('-', StringSplitOptions.RemoveEmptyEntries))
                {
                    AddStemmedIfMeaningful(part, tokens);
                }
            }
            else
            {
                AddStemmedIfMeaningful(raw, tokens);
            }
        }

        return tokens;
    }

    private static void AddStemmedIfMeaningful(string raw, List<string> tokens)
    {
        if (Stopwords.Contains(raw))
        {
            return;
        }

        // Ignore single-character non-numeric noise while retaining short meaningful tokens like "8" or "gf".
        if (raw.Length == 1 && !char.IsDigit(raw[0]))
        {
            return;
        }

        var stemmed = StemToken(raw);
        if (!string.IsNullOrWhiteSpace(stemmed) && !Stopwords.Contains(stemmed))
        {
            tokens.Add(stemmed);
        }
    }

    private static string StemToken(string token)
    {
        if (token.Length <= 3)
        {
            return token;
        }

        if (token.EndsWith("ies", StringComparison.Ordinal) && token.Length > 4)
        {
            return string.Concat(token.AsSpan(0, token.Length - 3), "y");
        }

        if ((token.EndsWith("ches", StringComparison.Ordinal) ||
             token.EndsWith("shes", StringComparison.Ordinal) ||
             token.EndsWith("xes", StringComparison.Ordinal) ||
             token.EndsWith("zes", StringComparison.Ordinal) ||
             token.EndsWith("sses", StringComparison.Ordinal)) && token.Length > 4)
        {
            return token[..^2];
        }

        if (token.EndsWith("ing", StringComparison.Ordinal) && token.Length > 5)
        {
            return token[..^3];
        }

        if (token.EndsWith("ed", StringComparison.Ordinal) && token.Length > 4)
        {
            return token[..^2];
        }

        if (token.EndsWith('s') && !token.EndsWith("ss", StringComparison.Ordinal) && token.Length > 3)
        {
            return token[..^1];
        }

        return token;
    }

    [GeneratedRegex(@"[a-z0-9]+(?:-[a-z0-9]+)*", RegexOptions.Compiled)]
    private static partial Regex WordTokenRegex();
}
