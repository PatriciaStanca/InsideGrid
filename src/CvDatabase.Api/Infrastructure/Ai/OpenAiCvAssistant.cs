using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CvDatabase.Api.Data.DTOs;

namespace CvDatabase.Api.Infrastructure.Ai;

public sealed class OpenAiCvAssistant(HttpClient httpClient, IConfiguration configuration)
{
    private readonly string? _apiKey = configuration["OpenAI:ApiKey"];
    private readonly string _model = configuration["OpenAI:Model"] ?? "gpt-5.5";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    public async Task<JobMatchResponse> MatchCandidatesAsync(
        JobMatchRequest request,
        IReadOnlyList<CandidateProfile> candidates,
        CancellationToken cancellationToken)
    {
        var prompt = $$"""
        Du är en CV- och bemanningsspecialist. Matcha uppdragsannonsen mot kandidaterna.
        Returnera kort svensk sammanfattning och rankade kandidater. Var tydlig om någon är upptagen.

        Uppdragsannons:
        {{request.JobAdvertisement}}

        Kandidater:
        {{JsonSerializer.Serialize(candidates)}}
        """;

        var text = await SendResponseAsync(prompt, cancellationToken);
        if (string.IsNullOrWhiteSpace(text))
        {
            return new JobMatchResponse("", EmptyAnalysis(), []);
        }

        return new JobMatchResponse(text, EmptyAnalysis(), []);
    }

    public async Task<TailoredCvResponse> GenerateTailoredCvAsync(OpenAiCandidateContext context, CancellationToken cancellationToken)
    {
        var prompt = $$"""
        Du är en senior CV-skribent för konsultbolag.
        Skapa ett anpassat CV på {{context.Language}} i Markdown.
        Använd bara verifierbara fakta från kandidatprofilen. Hitta relevanta formuleringar från annonsen, men hitta inte på erfarenhet.
        Lägg till reviewWarnings om något viktigt saknas.

        Uppdragsannons:
        {{context.JobAdvertisement}}

        Kandidat:
        {{JsonSerializer.Serialize(context.Candidate)}}
        """;

        var markdown = await SendResponseAsync(prompt, cancellationToken);
        return new TailoredCvResponse(
            context.Candidate.Id,
            context.Language,
            markdown,
            context.Candidate.Skills,
            string.IsNullOrWhiteSpace(markdown) ? ["OpenAI gav inget textsvar."] : []);
    }

    private async Task<string> SendResponseAsync(string prompt, CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            return "";
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = JsonContent.Create(new
        {
            model = _model,
            input = prompt
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (document.RootElement.TryGetProperty("output_text", out var outputText))
        {
            return outputText.GetString() ?? "";
        }

        var json = document.RootElement.GetRawText();
        return json.Length > 4000 ? string.Concat(json.AsSpan(0, 4000), "...") : json;
    }

    private static JobAdvertisementAnalysis EmptyAnalysis()
    {
        return new JobAdvertisementAnalysis(
            "OpenAI-analys",
            "",
            "",
            false,
            "",
            "",
            [],
            [],
            [],
            [],
            [],
            "Ej identifierad",
            [],
            "Ej angivet",
            "Ej angivet",
            false,
            null,
            "Ej angivet",
            []);
    }
}
