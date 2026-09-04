using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Interfaces;

namespace CvDatabase.Api.Data.Repositories;

public sealed class InMemoryCandidateRepository : ICandidateRepository
{
    private readonly object _gate = new();
    private readonly List<CandidateProfile> _candidates =
    [
        new(
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
            DateTimeOffset.UtcNow),
        new(
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
            DateTimeOffset.UtcNow),
        new(
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
            DateTimeOffset.UtcNow)
    ];

    public Task<IReadOnlyList<CandidateProfile>> SearchAsync(string? query, string? status, string? availability, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            IReadOnlyList<CandidateProfile> result = _candidates
                .Where(candidate => Matches(candidate, query, status, availability))
                .OrderBy(candidate => candidate.Availability == "Tillgänglig" ? 0 : 1)
                .ThenBy(candidate => candidate.Name)
                .ToArray();
            return Task.FromResult(result);
        }
    }

    public Task<CandidateProfile?> FindAsync(Guid id, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            return Task.FromResult(_candidates.FirstOrDefault(candidate => candidate.Id == id));
        }
    }

    public Task<CandidateProfile> CreateAsync(CandidateUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var candidate = ToCandidate(Guid.NewGuid(), request);
        lock (_gate)
        {
            _candidates.Add(candidate);
        }

        return Task.FromResult(candidate);
    }

    public Task<CandidateProfile?> UpdateAsync(Guid id, CandidateUpsertRequest request, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            var index = _candidates.FindIndex(candidate => candidate.Id == id);
            if (index < 0)
            {
                return Task.FromResult<CandidateProfile?>(null);
            }

            var updated = ToCandidate(id, request);
            _candidates[index] = updated;
            return Task.FromResult<CandidateProfile?>(updated);
        }
    }

    public Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            return Task.FromResult(_candidates.RemoveAll(candidate => candidate.Id == id) > 0);
        }
    }

    private static CandidateProfile ToCandidate(Guid id, CandidateUpsertRequest request)
    {
        return new CandidateProfile(
            id,
            request.Name.Trim(),
            request.Title.Trim(),
            request.Email.Trim(),
            request.Phone.Trim(),
            request.Location.Trim(),
            request.Availability.Trim(),
            request.CurrentAssignment.Trim(),
            request.AvailableFrom,
            request.ExperienceYears,
            request.AvatarDataUrl.Trim(),
            request.Skills.Select(skill => skill.Trim()).Where(skill => skill.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            request.Languages.Select(language => language.Trim()).Where(language => language.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            request.Projects,
            request.Summary.Trim(),
            request.Notes.Trim(),
            DateTimeOffset.UtcNow);
    }

    private static bool Matches(CandidateProfile candidate, string? query, string? status, string? availability)
    {
        var normalizedQuery = query?.Trim();
        var queryMatches = string.IsNullOrWhiteSpace(normalizedQuery)
            || string.Join(' ', candidate.Name, candidate.Title, candidate.Location, candidate.Summary, candidate.CurrentAssignment, string.Join(' ', candidate.Skills))
                .Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase);

        var statusMatches = string.IsNullOrWhiteSpace(status)
            || candidate.Availability.Equals(status, StringComparison.OrdinalIgnoreCase);

        var availabilityMatches = string.IsNullOrWhiteSpace(availability)
            || candidate.Availability.Equals(availability, StringComparison.OrdinalIgnoreCase);

        return queryMatches && statusMatches && availabilityMatches;
    }
}
