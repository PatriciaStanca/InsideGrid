using System.Net.Http.Headers;
using System.Text.Json;
using CvDatabase.Api.Data.DTOs;

namespace CvDatabase.Api.Infrastructure.Ai;

public sealed class OpenAiJobResearchService(HttpClient httpClient, IConfiguration configuration)
{
    private readonly string? _apiKey = configuration["OpenAI:ApiKey"];
    private readonly string _model = configuration["OpenAI:Model"] ?? "gpt-5.5";

    public async Task<JobResearchResponse> ChatAsync(JobResearchRequest request, CancellationToken cancellationToken)
    {
        const string instructions = "You are a careful recruitment research partner. Research the official company website and several current comparable job advertisements. Separate verified company facts from market patterns. Never invent company claims, salary, benefits or requirements. Reply conversationally, cite web-derived claims and ask at most two useful follow-up questions. Do not write the final advertisement yet.";
        var result = await SendAsync(request, instructions, cancellationToken);
        return new JobResearchResponse(result.Text, result.Sources);
    }

    public async Task<JobDescriptionResponse> DraftAsync(JobResearchRequest request, CancellationToken cancellationToken)
    {
        const string instructions = "Write a concise, inclusive English job advertisement. Research the official company website and current comparable ads when a website is supplied. Use verified company facts only and similar ads only for market patterns; never copy wording. Do not invent salary, benefits, years, technology or culture claims. Use a short introduction, What you will do, What we are looking for, and practical details. Use plain text and short bullets without citations in the final advertisement.";
        var result = await SendAsync(request, instructions, cancellationToken);
        return new JobDescriptionResponse(result.Text, result.Sources);
    }

    private async Task<(string Text, IReadOnlyList<ResearchSource> Sources)> SendAsync(JobResearchRequest input, string instructions, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_apiKey)) throw new InvalidOperationException("OpenAI is not configured on the .NET API.");
        var body = new Dictionary<string, object?>
        {
            ["model"] = _model,
            ["store"] = false,
            ["instructions"] = instructions,
            ["input"] = JsonSerializer.Serialize(input),
            ["max_output_tokens"] = 900
        };
        if (!string.IsNullOrWhiteSpace(input.CompanyWebsite))
        {
            body["tools"] = new[] { new { type = "web_search_preview", search_context_size = "medium" } };
            body["include"] = new[] { "web_search_call.action.sources" };
        }
        using var message = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses");
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        message.Content = JsonContent.Create(body);
        using var response = await httpClient.SendAsync(message, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(cancellationToken));
        var root = document.RootElement;
        var text = root.TryGetProperty("output_text", out var outputText) ? outputText.GetString() ?? "" : "";
        var sources = new Dictionary<string, ResearchSource>(StringComparer.OrdinalIgnoreCase);
        if (root.TryGetProperty("output", out var output))
        {
            foreach (var item in output.EnumerateArray())
            {
                if (!item.TryGetProperty("action", out var action) || !action.TryGetProperty("sources", out var sourceItems)) continue;
                foreach (var source in sourceItems.EnumerateArray())
                {
                    var url = source.TryGetProperty("url", out var urlElement) ? urlElement.GetString() : null;
                    if (string.IsNullOrWhiteSpace(url)) continue;
                    var title = source.TryGetProperty("title", out var titleElement) ? titleElement.GetString() : null;
                    sources[url] = new ResearchSource(title ?? new Uri(url).Host, url);
                }
            }
        }
        if (string.IsNullOrWhiteSpace(text)) throw new InvalidOperationException("OpenAI returned an empty response.");
        return (text, sources.Values.Take(8).ToArray());
    }
}
