using CvDatabase.Api.Core.Interfaces;
using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CvDatabase.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController(IAuthService auth) : ApiControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequestDto request, CancellationToken cancellationToken)
    {
        return ToActionResult(await auth.LoginAsync(request, cancellationToken));
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        return Ok(new
        {
            name = User.Identity?.Name,
            email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value,
            roles = User.FindAll(System.Security.Claims.ClaimTypes.Role).Select(claim => claim.Value).ToArray()
        });
    }

    [HttpPost("users")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Register(RegisterUserRequestDto request, CancellationToken cancellationToken)
    {
        return ToActionResult(await auth.RegisterAsync(request, cancellationToken));
    }

    [HttpGet("users")]
    [Authorize(Policy = Policies.AdminOnly)]
    public async Task<IActionResult> Users(CancellationToken cancellationToken)
    {
        return ToActionResult(await auth.GetUsersAsync(cancellationToken));
    }
}
