namespace CvDatabase.Api.Infrastructure;

public static class SecurityHeadersMiddleware
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
            context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
            context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");
            context.Response.Headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

            if (context.Request.IsHttps)
            {
                context.Response.Headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            }

            await next();
        });
    }
}
