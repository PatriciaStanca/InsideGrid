namespace CvDatabase.Api.Data.DTOs;

public sealed record ApplicationRecord(
    Guid Id,
    string Customer,
    string Role,
    string Advertisement,
    IReadOnlyList<Guid> CandidateIds,
    IReadOnlyList<string> CandidateNames,
    string Status,
    string Feedback,
    string SourceUrl,
    string CreatedBy,
    DateTimeOffset AppliedAt,
    DateTimeOffset UpdatedAt);

public sealed record ApplicationCreateRequest(
    string Customer,
    string Role,
    string Advertisement,
    IReadOnlyList<Guid>? CandidateIds = null,
    IReadOnlyList<string>? CandidateNames = null,
    string SourceUrl = "",
    string Status = "Utkast");

public sealed record ApplicationUpdateRequest(
    string Status,
    string Feedback);

public sealed record ApplicationDuplicateCheckRequest(
    string Advertisement);

public sealed record ApplicationDuplicateCandidate(
    Guid ApplicationId,
    string Customer,
    string Role,
    string Status,
    int Similarity,
    string Reason);

public sealed record ApplicationDuplicateCheckResponse(
    bool IsLikelyDuplicate,
    IReadOnlyList<ApplicationDuplicateCandidate> Matches);
