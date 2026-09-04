using System.Security.Claims;

namespace CvDatabase.Api.Infrastructure;

public sealed class CurrentUser(IHttpContextAccessor accessor)
{
    public string Name => accessor.HttpContext?.User.Identity?.Name ?? "Unknown";

    public bool IsInRole(string role)
    {
        return accessor.HttpContext?.User.IsInRole(role) == true;
    }
}
