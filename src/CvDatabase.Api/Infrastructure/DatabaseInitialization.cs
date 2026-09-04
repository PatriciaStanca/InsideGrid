using CvDatabase.Api.Data.Context;
using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Entities;
using CvDatabase.Api.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;

namespace CvDatabase.Api.Infrastructure;

public static class DatabaseInitialization
{
    public static async Task InitializeDatabaseAsync(this WebApplication app)
    {
        if (string.IsNullOrWhiteSpace(app.Configuration.GetConnectionString("Default")))
        {
            return;
        }

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CvDatabaseDbContext>();
        await db.Database.EnsureCreatedAsync();

        if (!await db.Users.AnyAsync())
        {
            db.Users.AddRange(
                CreateUser("admin@cvdatabase.local", "Admin", "Admin123!", Roles.Admin),
                CreateUser("manager@cvdatabase.local", "Manager", "Manager123!", Roles.Manager),
                CreateUser("employee@cvdatabase.local", "Employee", "Employee123!", Roles.Employee));
        }

        if (await db.Candidates.AnyAsync())
        {
            await db.SaveChangesAsync();
            return;
        }

        db.Candidates.AddRange(
            ToEntity(new CandidateProfile(
                Guid.Parse("1a25de43-5f56-4f0d-9f1b-1d447fc73a11"),
                "Alex Andersson",
                "Senior frontendutvecklare",
                "alex@example.com",
                "070-123 45 67",
                "Stockholm",
                "Tillgänglig",
                "Intern produktplattform",
                DateOnly.FromDateTime(DateTime.Today.AddDays(14)),
                7,
                "",
                ["React", "TypeScript", "UX", "Tillgänglighet", "Azure"],
                ["Svenska", "Engelska"],
                [
                    new ProjectExperience(
                        "Fintechbolag",
                        "Frontend lead",
                        "Ledde migrering till React och komponentbibliotek för flera team.",
                        ["React", "TypeScript", "Design system"],
                        new DateOnly(2023, 1, 1),
                        null)
                ],
                "Produktnära utvecklare med stark känsla för användarflöden, komponentarkitektur och kvalitet.",
                "Bra match för uppdrag med UI-ansvar.",
                DateTimeOffset.UtcNow)),
            ToEntity(new CandidateProfile(
                Guid.Parse("77b0345c-4d03-4f13-82d6-4d40fb91b105"),
                "Sara Svensson",
                "Backendutvecklare",
                "sara@example.com",
                "070-222 33 44",
                "Göteborg",
                "Upptagen",
                "Kunduppdrag inom integration",
                DateOnly.FromDateTime(DateTime.Today.AddMonths(3)),
                9,
                "",
                ["C#", ".NET", "SQL Server", "Azure", "API-design", "Säkerhet"],
                ["Svenska", "Engelska"],
                [
                    new ProjectExperience(
                        "Offentlig sektor",
                        "Systemutvecklare",
                        "Byggde säkra API:er och integrationsflöden med auditloggning.",
                        ["C#", ".NET", "SQL Server", "Azure"],
                        new DateOnly(2022, 8, 1),
                        null)
                ],
                "Backendprofil med djup erfarenhet av säkra API:er, datamodellering och molndrift.",
                "Upptagen just nu men mycket relevant för backend- och integrationsuppdrag.",
                DateTimeOffset.UtcNow)),
            ToEntity(new CandidateProfile(
                Guid.Parse("3bb3cb8c-a23c-4a32-98b8-e3c7b67165e2"),
                "Patricia Stanca",
                "Analytiker",
                "patriciastanca@hotmail.com",
                "+46 737 828 097",
                "Göteborg",
                "Tillgänglig",
                "Senior analyskonsult på Ask Analytics",
                DateOnly.FromDateTime(DateTime.Today),
                5,
                "",
                [
                    "SQL", "Power BI", "Python", "SAP", "Azure Fabric", "Data Warehouse", "Power Automate",
                    "Machine Learning", "AI", "Datamodellering", "ETL-processer", "CRM", "ERP",
                    "Microsoft 365", "Datavisualisering", "Antura", "Confluence", "Hotjar", "Piwik PRO",
                    "Looker Studio", "Supermetrics", "Excel", "Netigate", "Kravinsamling", "Processförbättring",
                    "Webbanalys", "Budgetering", "PMO"
                ],
                ["Svenska", "Engelska"],
                [
                    new ProjectExperience(
                        "Ask Analytics",
                        "Senior analyskonsult",
                        "Rådgiver kunder inom analysarkitektur, dataintegration och moderna dataplattformar. Designar integrationer mellan API:er, affärssystem och analysplattformar med Snowflake, Python och Fivetran.",
                        ["SQL", "Python", "Snowflake", "Fivetran", "API", "Dataintegration", "Data Warehouse"],
                        new DateOnly(2026, 3, 1),
                        null),
                    new ProjectExperience(
                        "Kundsegmentering och Azure Fabric",
                        "Analytiker",
                        "Genomförde strategisk kundsegmentering och byggde datastruktur genom att kombinera flera datakällor. Deltog i kravställning, testning och migrering av data till Azure Fabric.",
                        ["Azure Fabric", "Datamodellering", "Kunddata", "Kravinsamling", "Testning"],
                        new DateOnly(2025, 1, 1),
                        null),
                    new ProjectExperience(
                        "CRM- och affärssystem",
                        "Analytiker / informationsarkitekt",
                        "Ledde grundläggande arbete med nytt CRM- och affärssystem, inklusive kartläggning av kundservice- och säljprocesser samt kravställning och informationsarkitektur.",
                        ["CRM", "ERP", "Processkartläggning", "Kravinsamling", "Informationsarkitektur"],
                        new DateOnly(2024, 1, 1),
                        null),
                    new ProjectExperience(
                        "Power BI och KPI-rapportering",
                        "BI-analytiker",
                        "Utvecklade avancerade Power BI-rapporter för kunduppföljning, konsumtionsanalys och arbetsflödesprestanda med handlingsbara KPI:er.",
                        ["Power BI", "KPI", "Datavisualisering", "Webbanalys", "Excel"],
                        new DateOnly(2023, 1, 1),
                        null)
                ],
                "Analytiker som omvandlar komplex data till insikter som leder till åtgärder och bygger broar mellan verksamhet, analys och IT. Stark inom datadrivna beslut, automatisering, kravinsamling och strategiskt värdeskapande.",
                "Importerad från Patricia Stanca - SE.docx.pdf. Första sidan läst från PDF-preview; komplettera gärna med resterande erfarenhet när textutdrag finns.",
                DateTimeOffset.UtcNow)));

        await db.SaveChangesAsync();
    }

    private static AppUserEntity CreateUser(string email, string displayName, string password, string role)
    {
        return new AppUserEntity
        {
            Id = Guid.NewGuid(),
            Email = email,
            NormalizedEmail = email.ToUpperInvariant(),
            DisplayName = displayName,
            PasswordHash = PasswordService.Hash(password),
            Role = role,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private static CandidateEntity ToEntity(CandidateProfile candidate)
    {
        return new CandidateEntity
        {
            Id = candidate.Id,
            Name = candidate.Name,
            Title = candidate.Title,
            Email = candidate.Email,
            Phone = candidate.Phone,
            Location = candidate.Location,
            Availability = candidate.Availability,
            CurrentAssignment = candidate.CurrentAssignment,
            AvailableFrom = candidate.AvailableFrom,
            ExperienceYears = candidate.ExperienceYears,
            AvatarDataUrl = candidate.AvatarDataUrl,
            Skills = candidate.Skills.ToArray(),
            Languages = candidate.Languages.ToArray(),
            Summary = candidate.Summary,
            Notes = candidate.Notes,
            UpdatedAt = candidate.UpdatedAt,
            Projects = candidate.Projects.Select(project => new CandidateProjectEntity
            {
                Id = Guid.NewGuid(),
                CandidateId = candidate.Id,
                Customer = project.Customer,
                Role = project.Role,
                Description = project.Description,
                Technologies = project.Technologies.ToArray(),
                StartDate = project.StartDate,
                EndDate = project.EndDate
            }).ToList()
        };
    }
}
