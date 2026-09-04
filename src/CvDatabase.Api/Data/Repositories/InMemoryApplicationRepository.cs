using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Entities;
using CvDatabase.Api.Data.Interfaces;

namespace CvDatabase.Api.Data.Repositories;

public sealed class InMemoryApplicationRepository : IApplicationRepository
{
    private readonly List<ApplicationEntity> _applications =
    [
        new()
        {
            Id = Guid.Parse("f7f2b0dc-0178-405f-bbe0-83b53e9d3a44"),
            Customer = "Nordic Retail",
            Role = "Senior React-konsult",
            Advertisement = "Senior React-konsult med TypeScript, UX och Azure sökes för e-handelsplattform.",
            CandidateIds = "1a25de43-5f56-4f0d-9f1b-1d447fc73a11",
            CandidateNames = "Alex Andersson",
            Status = "CV skickat",
            Feedback = "Väntar återkoppling från kund.",
            SourceUrl = "",
            CreatedBy = "manager@cvdatabase.local",
            AppliedAt = DateTimeOffset.UtcNow.AddDays(-7),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-2)
        },
        new()
        {
            Id = Guid.Parse("1dbf94bb-57f2-43f2-a6ce-7fdf86f96855"),
            Customer = "BankConnect",
            Role = ".NET integrationsutvecklare",
            Advertisement = "Backendutvecklare med C#, .NET, SQL Server, Azure och API-design.",
            CandidateIds = "77b0345c-4d03-4f13-82d6-4d40fb91b105",
            CandidateNames = "Sara Svensson",
            Status = "Intervju",
            Feedback = "Sara presenterad. Kund vill boka teknisk intervju.",
            SourceUrl = "",
            CreatedBy = "manager@cvdatabase.local",
            AppliedAt = DateTimeOffset.UtcNow.AddDays(-3),
            UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
        }
    ];

    public InMemoryApplicationRepository()
    {
        foreach (var application in _applications)
        {
            application.NormalizedFingerprint = ApplicationMatching.Fingerprint(application.Advertisement);
        }
    }

    public Task<IReadOnlyList<ApplicationRecord>> ListAsync(CancellationToken cancellationToken = default)
    {
        lock (_applications)
        {
            return Task.FromResult<IReadOnlyList<ApplicationRecord>>(_applications
                .OrderByDescending(application => application.UpdatedAt)
                .Select(ToRecord)
                .ToArray());
        }
    }

    public Task<ApplicationRecord> CreateAsync(ApplicationCreateRequest request, string createdBy, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var application = new ApplicationEntity
        {
            Id = Guid.NewGuid(),
            Customer = string.IsNullOrWhiteSpace(request.Customer) ? "Okänd kund" : request.Customer.Trim(),
            Role = string.IsNullOrWhiteSpace(request.Role) ? "Okänd roll" : request.Role.Trim(),
            Advertisement = request.Advertisement.Trim(),
            CandidateIds = JoinIds(request.CandidateIds),
            CandidateNames = JoinNames(request.CandidateNames),
            NormalizedFingerprint = ApplicationMatching.Fingerprint(request.Advertisement),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Utkast" : request.Status.Trim(),
            Feedback = "",
            SourceUrl = request.SourceUrl.Trim(),
            CreatedBy = createdBy,
            AppliedAt = now,
            UpdatedAt = now
        };

        lock (_applications)
        {
            _applications.Add(application);
        }

        return Task.FromResult(ToRecord(application));
    }

    public Task<ApplicationRecord?> UpdateAsync(Guid id, ApplicationUpdateRequest request, CancellationToken cancellationToken = default)
    {
        lock (_applications)
        {
            var application = _applications.FirstOrDefault(item => item.Id == id);
            if (application is null)
            {
                return Task.FromResult<ApplicationRecord?>(null);
            }

            application.Status = request.Status.Trim();
            application.Feedback = request.Feedback.Trim();
            application.UpdatedAt = DateTimeOffset.UtcNow;
            return Task.FromResult<ApplicationRecord?>(ToRecord(application));
        }
    }

    public Task<ApplicationDuplicateCheckResponse> CheckDuplicateAsync(string advertisement, CancellationToken cancellationToken = default)
    {
        lock (_applications)
        {
            var matches = _applications
                .Select(application => new { Application = application, Similarity = ApplicationMatching.Similarity(advertisement, application.Advertisement) })
                .Where(match => match.Similarity >= 45)
                .OrderByDescending(match => match.Similarity)
                .Take(5)
                .Select(match => new ApplicationDuplicateCandidate(
                    match.Application.Id,
                    match.Application.Customer,
                    match.Application.Role,
                    match.Application.Status,
                    match.Similarity,
                    ApplicationMatching.Reason(match.Application, match.Similarity)))
                .ToArray();

            return Task.FromResult(new ApplicationDuplicateCheckResponse(matches.Any(match => match.Similarity >= 55), matches));
        }
    }

    private static ApplicationRecord ToRecord(ApplicationEntity application)
    {
        return new ApplicationRecord(
            application.Id,
            application.Customer,
            application.Role,
            application.Advertisement,
            SplitIds(application.CandidateIds),
            SplitNames(application.CandidateNames),
            application.Status,
            application.Feedback,
            application.SourceUrl,
            application.CreatedBy,
            application.AppliedAt,
            application.UpdatedAt);
    }

    private static string JoinIds(IReadOnlyList<Guid>? ids)
    {
        return ids is null ? "" : string.Join(",", ids.Where(id => id != Guid.Empty));
    }

    private static string JoinNames(IReadOnlyList<string>? names)
    {
        return names is null ? "" : string.Join(" | ", names.Select(name => name.Trim()).Where(name => !string.IsNullOrWhiteSpace(name)).Distinct(StringComparer.OrdinalIgnoreCase));
    }

    private static IReadOnlyList<Guid> SplitIds(string value)
    {
        return value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(item => Guid.TryParse(item, out var id) ? id : Guid.Empty)
            .Where(id => id != Guid.Empty)
            .ToArray();
    }

    private static IReadOnlyList<string> SplitNames(string value)
    {
        return value
            .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToArray();
    }
}
