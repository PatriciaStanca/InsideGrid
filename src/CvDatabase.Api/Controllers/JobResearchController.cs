using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Infrastructure.Ai;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CvDatabase.Api.Controllers;

[Route("api/ai/jobs")]
[Authorize]
[EnableRateLimiting("ai")]
public sealed class JobResearchController(GeminiJobResearchService research) : ApiControllerBase
{
    [HttpPost("research")]
    public async Task<ActionResult<JobResearchResponse>> Research(JobResearchRequest request, CancellationToken cancellationToken)
        => Ok(await research.ChatAsync(request, cancellationToken));

    [HttpPost("draft")]
    public async Task<ActionResult<JobDescriptionResponse>> Draft(JobResearchRequest request, CancellationToken cancellationToken)
        => Ok(await research.DraftAsync(request, cancellationToken));
}
