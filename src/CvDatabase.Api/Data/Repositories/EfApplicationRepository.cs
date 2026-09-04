using CvDatabase.Api.Data.Context;
using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Entities;
using CvDatabase.Api.Data.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CvDatabase.Api.Data.Repositories;

public sealed class EfApplicationRepository(CvDatabaseDbContext db) : IApplicationRepository
{
    public async Task<IReadOnlyList<ApplicationRecord>> ListAsync(CancellationToken cancellationToken = default)
    {
        return await db.Applications
            .AsNoTracking()
            .OrderByDescending(application => application.UpdatedAt)
            .Select(application => ToRecord(application))
            .ToArrayAsync(cancellationToken);
    }

    public async Task<ApplicationRecord> CreateAsync(ApplicationCreateRequest request, string createdBy, CancellationToken cancellationToken = default)
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
            SourceUrl = request.SourceUrl.Trim(),
            CreatedBy = createdBy,
            AppliedAt = now,
            UpdatedAt = now
        };

        db.Applications.Add(application);
        await db.SaveChangesAsync(cancellationToken);
        return ToRecord(application);
    }

    public async Task<ApplicationRecord?> UpdateAsync(Guid id, ApplicationUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var application = await db.Applications.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (application is null)
        {
            return null;
        }

        application.Status = request.Status.Trim();
        application.Feedback = request.Feedback.Trim();
        application.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return ToRecord(application);
    }

    public async Task<ApplicationDuplicateCheckResponse> CheckDuplicateAsync(string advertisement, CancellationToken cancellationToken = default)
    {
        var applications = await db.Applications.AsNoTracking().ToArrayAsync(cancellationToken);
        var matches = applications
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

        return new ApplicationDuplicateCheckResponse(matches.Any(match => match.Similarity >= 55), matches);
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
