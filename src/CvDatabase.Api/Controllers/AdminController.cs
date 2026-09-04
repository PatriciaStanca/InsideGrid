using System.Security.Claims;
using CvDatabase.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvDatabase.Api.Controllers;

[Route("api/admin")]
[Authorize(Policy = Policies.AdminOnly)]
public sealed class AdminController : ApiControllerBase
{
    [HttpGet("users/me")]
    public IActionResult GetCurrentUser()
    {
        return Ok(new
        {
            name = User.Identity?.Name ?? "Demo user",
            roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray()
        });
    }
}
