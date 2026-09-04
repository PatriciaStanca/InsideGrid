using CvDatabase.Api.Data.Context;
using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Entities;
using CvDatabase.Api.Data.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CvDatabase.Api.Data.Repositories;

public sealed class EfCandidateRepository(CvDatabaseDbContext db) : ICandidateRepository
{
    public async Task<IReadOnlyList<CandidateProfile>> SearchAsync(
        string? query,
        string? status,
        string? availability,
        CancellationToken cancellationToken = default)
    {
        var candidates = db.Candidates
            .Include(candidate => candidate.Projects)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(availability))
        {
            candidates = candidates.Where(candidate => candidate.Availability == availability);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            candidates = candidates.Where(candidate => candidate.Availability == status);
        }

        var result = await candidates
            .OrderBy(candidate => candidate.Availability == "Tillgänglig" ? 0 : 1)
            .ThenBy(candidate => candidate.Name)
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(query))
        {
            result = result
                .Where(candidate => Matches(candidate, query))
                .ToList();
        }

        return result.Select(ToProfile).ToArray();
    }

    public async Task<CandidateProfile?> FindAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var candidate = await db.Candidates
            .Include(item => item.Projects)
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);

        return candidate is null ? null : ToProfile(candidate);
    }

    public async Task<CandidateProfile> CreateAsync(CandidateUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var candidate = ToEntity(Guid.NewGuid(), request);
        db.Candidates.Add(candidate);
        await db.SaveChangesAsync(cancellationToken);
        return ToProfile(candidate);
    }

    public async Task<CandidateProfile?> UpdateAsync(Guid id, CandidateUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var existing = await db.Candidates
            .Include(candidate => candidate.Projects)
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (existing is null)
        {
            return null;
        }

        db.CandidateProjects.RemoveRange(existing.Projects);
        var updated = ToEntity(id, request);
        db.Entry(existing).CurrentValues.SetValues(updated);
        existing.Projects = updated.Projects;
        await db.SaveChangesAsync(cancellationToken);
        return ToProfile(existing);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await db.Candidates
            .Where(candidate => candidate.Id == id)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted > 0;
    }

    private static CandidateEntity ToEntity(Guid id, CandidateUpsertRequest request)
    {
        return new CandidateEntity
        {
            Id = id,
            Name = request.Name.Trim(),
            Title = request.Title.Trim(),
            Email = request.Email.Trim(),
            Phone = request.Phone.Trim(),
            Location = request.Location.Trim(),
            Availability = request.Availability.Trim(),
            CurrentAssignment = request.CurrentAssignment.Trim(),
            AvailableFrom = request.AvailableFrom,
            ExperienceYears = request.ExperienceYears,
            AvatarDataUrl = request.AvatarDataUrl.Trim(),
            Skills = request.Skills.Select(skill => skill.Trim()).Where(skill => skill.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            Languages = request.Languages.Select(language => language.Trim()).Where(language => language.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            Summary = request.Summary.Trim(),
            Notes = request.Notes.Trim(),
            UpdatedAt = DateTimeOffset.UtcNow,
            Projects = request.Projects.Select(project => new CandidateProjectEntity
            {
                Id = Guid.NewGuid(),
                CandidateId = id,
                Customer = project.Customer.Trim(),
                Role = project.Role.Trim(),
                Description = project.Description.Trim(),
                Technologies = project.Technologies.Select(technology => technology.Trim()).Where(technology => technology.Length > 0).ToArray(),
                StartDate = project.StartDate,
                EndDate = project.EndDate
            }).ToList()
        };
    }

    private static CandidateProfile ToProfile(CandidateEntity candidate)
    {
        return new CandidateProfile(
            candidate.Id,
            candidate.Name,
            candidate.Title,
            candidate.Email,
            candidate.Phone,
            candidate.Location,
            candidate.Availability,
            candidate.CurrentAssignment,
            candidate.AvailableFrom,
            candidate.ExperienceYears,
            candidate.AvatarDataUrl,
            candidate.Skills,
            candidate.Languages,
            candidate.Projects
                .OrderByDescending(project => project.StartDate)
                .Select(project => new ProjectExperience(project.Customer, project.Role, project.Description, project.Technologies, project.StartDate, project.EndDate))
                .ToArray(),
            candidate.Summary,
            candidate.Notes,
            candidate.UpdatedAt);
    }

    private static bool Matches(CandidateEntity candidate, string query)
    {
        return string.Join(' ', candidate.Name, candidate.Title, candidate.Location, candidate.Summary, candidate.CurrentAssignment, string.Join(' ', candidate.Skills))
            .Contains(query, StringComparison.OrdinalIgnoreCase);
    }
}
