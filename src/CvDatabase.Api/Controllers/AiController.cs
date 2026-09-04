using CvDatabase.Api.Core.Services;
using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CvDatabase.Api.Controllers;

[Route("api/ai")]
[Authorize(Policy = Policies.EmployeeRead)]
public sealed class AiController(CvAssistantService assistant, PdfExportService pdf) : ApiControllerBase
{
    [HttpPost("match")]
    [EnableRateLimiting("ai")]
    public async Task<IActionResult> Match(JobMatchRequest request, CancellationToken cancellationToken)
    {
        var result = await assistant.MatchJobAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("generate-cv")]
    [EnableRateLimiting("ai")]
    public async Task<IActionResult> GenerateCv(TailoredCvRequest request, CancellationToken cancellationToken)
    {
        var result = await assistant.GenerateTailoredCvAsync(request, cancellationToken);
        return Ok(result);
    }

    [HttpPost("generate-cv.pdf")]
    [EnableRateLimiting("ai")]
    public async Task<IActionResult> GenerateCvPdf(TailoredCvRequest request, CancellationToken cancellationToken)
    {
        var result = await assistant.GenerateTailoredCvAsync(request, cancellationToken);
        var bytes = pdf.GenerateMarkdownCv(result.Markdown);
        var language = string.IsNullOrWhiteSpace(result.Language) ? "sv" : result.Language;
        return File(bytes, "application/pdf", $"tailored-cv-{result.CandidateId}-{language}.pdf");
    }
}
