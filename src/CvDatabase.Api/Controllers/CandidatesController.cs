using CvDatabase.Api.Core.Services;
using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Interfaces;
using CvDatabase.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvDatabase.Api.Controllers;

[Route("api/candidates")]
[Authorize(Policy = Policies.EmployeeRead)]
public sealed class CandidatesController(ICandidateRepository repository, PdfExportService pdf) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? q,
        [FromQuery] string? status,
        [FromQuery] string? availability,
        CancellationToken cancellationToken)
    {
        var result = await repository.SearchAsync(q, status, availability, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var candidate = await repository.FindAsync(id, cancellationToken);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [HttpPost]
    [Authorize(Policy = Policies.ManagerWrite)]
    public async Task<IActionResult> Create(CandidateUpsertRequest request, CancellationToken cancellationToken)
    {
        var candidate = await repository.CreateAsync(request, cancellationToken);
        return Created($"/api/candidates/{candidate.Id}", candidate);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.ManagerWrite)]
    public async Task<IActionResult> Update(Guid id, CandidateUpsertRequest request, CancellationToken cancellationToken)
    {
        var candidate = await repository.UpdateAsync(id, request, cancellationToken);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        return await repository.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpGet("{id:guid}/cv.pdf")]
    public async Task<IActionResult> DownloadCv(Guid id, [FromQuery] string? language, CancellationToken cancellationToken)
    {
        var candidate = await repository.FindAsync(id, cancellationToken);
        if (candidate is null)
        {
            return NotFound();
        }

        var selectedLanguage = string.IsNullOrWhiteSpace(language) ? "sv" : language;
        var bytes = pdf.GenerateCandidateCv(candidate, selectedLanguage);
        return File(bytes, "application/pdf", $"{candidate.Name.Replace(' ', '-')}-cv-{selectedLanguage}.pdf");
    }
}
