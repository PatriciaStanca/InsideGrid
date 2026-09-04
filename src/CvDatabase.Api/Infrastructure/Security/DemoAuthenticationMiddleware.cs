using System.Security.Claims;

namespace CvDatabase.Api.Infrastructure.Security;

public static class DemoAuthenticationMiddleware
{
    public static IApplicationBuilder UseDemoAuthentication(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            if (context.User.Identity?.IsAuthenticated == true)
            {
                await next();
                return;
            }

            var name = context.Request.Headers["X-Demo-User"].FirstOrDefault() ?? "Patricia";
            var roles = context.Request.Headers["X-Demo-Roles"].FirstOrDefault();
            var selectedRoles = string.IsNullOrWhiteSpace(roles)
                ? [Roles.Employee, Roles.Manager]
                : roles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            var claims = new List<Claim> { new(ClaimTypes.Name, name) };
            claims.AddRange(selectedRoles.Select(role => new Claim(ClaimTypes.Role, role)));

            context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "DemoHeaders"));
            await next();
        });
    }
}
