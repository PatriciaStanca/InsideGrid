using System.Text.Json;
using CvDatabase.Api.Data.DTOs;

namespace CvDatabase.Api.Infrastructure.Ai;

public sealed class GeminiJobResearchService(HttpClient httpClient, IConfiguration configuration)
{
    private readonly string? _apiKey = configuration["Gemini:ApiKey"];
    private readonly string _model = configuration["Gemini:Model"] ?? "gemini-3.6-flash";

    public async Task<JobResearchResponse> ChatAsync(JobResearchRequest request, CancellationToken cancellationToken)
    {
        const string instructions = "You are a careful recruitment research partner. Research the supplied official company website and several current comparable job advertisements. Separate verified company facts from market patterns. Never invent company claims, salary, benefits or requirements. Reply conversationally in English, cite web-derived claims through the supplied sources, and ask at most two useful follow-up questions. Do not write the final advertisement yet.";
        var result = await SendAsync(request, instructions, cancellationToken);
        return new JobResearchResponse(result.Text, result.Sources);
    }

    public async Task<JobDescriptionResponse> DraftAsync(JobResearchRequest request, CancellationToken cancellationToken)
    {
        const string instructions = "Write a concise, inclusive English job advertisement. Research the supplied official company website and current comparable advertisements. Use verified company facts only and similar advertisements only for market patterns; never copy wording. Do not invent salary, benefits, years, technology or culture claims. Use a short introduction, What you will do, What we are looking for, and practical details. Return plain text with short bullets and no inline citations because sources are displayed separately. The draft must remain editable.";
        var result = await SendAsync(request, instructions, cancellationToken);
        return new JobDescriptionResponse(result.Text, result.Sources);
    }

    private async Task<(string Text, IReadOnlyList<ResearchSource> Sources)> SendAsync(
        JobResearchRequest input,
        string instructions,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("Gemini is not configured on the .NET API. Add Gemini:ApiKey to appsettings.Development.local.json.");
        }

        var tools = string.IsNullOrWhiteSpace(input.CompanyWebsite)
            ? new object[] { new { googleSearch = new { } } }
            : [new { googleSearch = new { } }, new { urlContext = new { } }];

        var body = new
        {
            systemInstruction = new { parts = new[] { new { text = instructions } } },
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = JsonSerializer.Serialize(input) } }
                }
            },
            tools,
            generationConfig = new { temperature = 0.2, maxOutputTokens = 900 }
        };

        var model = Uri.EscapeDataString(_model);
        using var message = new HttpRequestMessage(HttpMethod.Post,
            $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent");
        message.Headers.Add("x-goog-api-key", _apiKey);
        message.Content = JsonContent.Create(body);

        using var response = await httpClient.SendAsync(message, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Gemini request failed with status {(int)response.StatusCode}. Check the API key, model and free-tier quota.");
        }

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken));
        var root = document.RootElement;
        if (!root.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
        {
            throw new InvalidOperationException("Gemini returned no candidate response.");
        }

        var candidate = candidates[0];
        var textParts = new List<string>();
        if (candidate.TryGetProperty("content", out var content)
            && content.TryGetProperty("parts", out var parts))
        {
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement)
                    && !string.IsNullOrWhiteSpace(textElement.GetString()))
                {
                    textParts.Add(textElement.GetString()!);
                }
            }
        }

        var sources = new Dictionary<string, ResearchSource>(StringComparer.OrdinalIgnoreCase);
        if (candidate.TryGetProperty("groundingMetadata", out var groundingMetadata)
            && groundingMetadata.TryGetProperty("groundingChunks", out var chunks))
        {
            foreach (var chunk in chunks.EnumerateArray())
            {
                if (!chunk.TryGetProperty("web", out var web)) continue;
                var url = web.TryGetProperty("uri", out var uriElement) ? uriElement.GetString() : null;
                if (string.IsNullOrWhiteSpace(url)) continue;
                var title = web.TryGetProperty("title", out var titleElement) ? titleElement.GetString() : null;
                sources[url] = new ResearchSource(title ?? GetHost(url), url);
            }
        }

        if (!string.IsNullOrWhiteSpace(input.CompanyWebsite)
            && Uri.TryCreate(input.CompanyWebsite, UriKind.Absolute, out var companyUri))
        {
            sources.TryAdd(companyUri.AbsoluteUri, new ResearchSource(companyUri.Host, companyUri.AbsoluteUri));
        }

        var text = string.Join("\n", textParts).Trim();
        if (string.IsNullOrWhiteSpace(text)) throw new InvalidOperationException("Gemini returned an empty response.");
        return (text, sources.Values.Take(8).ToArray());
    }

    private static string GetHost(string url)
        => Uri.TryCreate(url, UriKind.Absolute, out var uri) ? uri.Host : "Source";
}
