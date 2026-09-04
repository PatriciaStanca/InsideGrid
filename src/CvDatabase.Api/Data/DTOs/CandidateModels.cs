namespace CvDatabase.Api.Data.DTOs;

public sealed record CandidateProfile(
    Guid Id,
    string Name,
    string Title,
    string Email,
    string Phone,
    string Location,
    string Availability,
    string CurrentAssignment,
    DateOnly? AvailableFrom,
    int ExperienceYears,
    string AvatarDataUrl,
    IReadOnlyList<string> Skills,
    IReadOnlyList<string> Languages,
    IReadOnlyList<ProjectExperience> Projects,
    string Summary,
    string Notes,
    DateTimeOffset UpdatedAt);

public sealed record ProjectExperience(
    string Customer,
    string Role,
    string Description,
    IReadOnlyList<string> Technologies,
    DateOnly StartDate,
    DateOnly? EndDate);

public sealed record CandidateUpsertRequest(
    string Name,
    string Title,
    string Email,
    string Phone,
    string Location,
    string Availability,
    string CurrentAssignment,
    DateOnly? AvailableFrom,
    int ExperienceYears,
    string AvatarDataUrl,
    IReadOnlyList<string> Skills,
    IReadOnlyList<string> Languages,
    IReadOnlyList<ProjectExperience> Projects,
    string Summary,
    string Notes);
