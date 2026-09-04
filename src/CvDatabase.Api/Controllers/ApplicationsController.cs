using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Interfaces;
using CvDatabase.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvDatabase.Api.Controllers;

[Route("api/applications")]
[Authorize(Policy = Policies.EmployeeRead)]
public sealed class ApplicationsController(IApplicationRepository applications) : ApiControllerBase
{
    [HttpGet]
    [Authorize(Policy = Policies.EmployeeRead)]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        return Ok(await applications.ListAsync(cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = Policies.ManagerWrite)]
    public async Task<IActionResult> Create(ApplicationCreateRequest request, CancellationToken cancellationToken)
    {
        var createdBy = User.Identity?.Name ?? User.FindFirst("email")?.Value ?? "unknown";
        var application = await applications.CreateAsync(request, createdBy, cancellationToken);
        return Created($"/api/applications/{application.Id}", application);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.ManagerWrite)]
    public async Task<IActionResult> Update(Guid id, ApplicationUpdateRequest request, CancellationToken cancellationToken)
    {
        var application = await applications.UpdateAsync(id, request, cancellationToken);
        return application is null ? NotFound() : Ok(application);
    }

    [HttpPost("check-duplicate")]
    [Authorize(Policy = Policies.EmployeeRead)]
    public async Task<IActionResult> CheckDuplicate(ApplicationDuplicateCheckRequest request, CancellationToken cancellationToken)
    {
        return Ok(await applications.CheckDuplicateAsync(request.Advertisement, cancellationToken));
    }
}
