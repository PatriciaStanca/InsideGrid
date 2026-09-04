using CvDatabase.Api.Core.Services;
using CvDatabase.Api.Core.Interfaces;
using CvDatabase.Api.Data.Context;
using CvDatabase.Api.Data.Interfaces;
using CvDatabase.Api.Data.Repositories;
using CvDatabase.Api.Infrastructure;
using CvDatabase.Api.Infrastructure.Ai;
using CvDatabase.Api.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

namespace CvDatabase.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddHttpClient<OpenAiCvAssistant>();
        services.AddHttpContextAccessor();
        services.AddSingleton<PdfExportService>();
        services.AddScoped<CurrentUser>();
        services.AddScoped<CvAssistantService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IJwtService, JwtTokenGenerator>();

        return services;
    }

    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        var databaseConnection = configuration.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(databaseConnection))
        {
            services.AddSingleton<ICandidateRepository, InMemoryCandidateRepository>();
            services.AddSingleton<IUserRepository, InMemoryUserRepository>();
            services.AddSingleton<IApplicationRepository, InMemoryApplicationRepository>();
            return services;
        }

        services.AddDbContext<CvDatabaseDbContext>(options => options.UseNpgsql(databaseConnection));
        services.AddScoped<ICandidateRepository, EfCandidateRepository>();
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IApplicationRepository, EfApplicationRepository>();

        return services;
    }
}
