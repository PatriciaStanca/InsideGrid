namespace CvDatabase.Api.Data.DTOs;

public sealed record JobMatchRequest(
    string JobAdvertisement,
    string Language = "sv",
    int MaxCandidates = 5);

public sealed record JobAdvertisementAnalysis(
    string Role,
    string SourceName,
    string SourceUrl,
    bool IsLinkOnly,
    string CompanyName,
    string RecruitingCompany,
    IReadOnlyList<string> ContactNames,
    IReadOnlyList<string> ContactEmails,
    IReadOnlyList<string> MustRequirements,
    IReadOnlyList<string> ShouldRequirements,
    IReadOnlyList<string> Technologies,
    string Industry,
    IReadOnlyList<string> Languages,
    string Seniority,
    string Location,
    bool RemotePossible,
    DateOnly? StartDate,
    string AssignmentType,
    IReadOnlyList<string> Keywords);

public sealed record CandidateMatchResult(
    Guid CandidateId,
    string Name,
    string Title,
    string Availability,
    int Score,
    IReadOnlyList<string> MatchingSkills,
    IReadOnlyList<string> MissingKeywords,
    string Reasoning,
    IReadOnlyList<string> StrongSignals,
    IReadOnlyList<string> Risks,
    IReadOnlyList<string> CvGaps,
    string SuggestedCvVersion,
    IReadOnlyList<string> RecommendedActions);

public sealed record JobMatchResponse(
    string Summary,
    JobAdvertisementAnalysis Analysis,
    IReadOnlyList<CandidateMatchResult> Candidates);

public sealed record TailoredCvRequest(
    Guid CandidateId,
    string JobAdvertisement,
    string Language,
    bool IncludePrivateNotes = false);

public sealed record TailoredCvResponse(
    Guid CandidateId,
    string Language,
    string Markdown,
    IReadOnlyList<string> KeywordsUsed,
    IReadOnlyList<string> ReviewWarnings);

public sealed record OpenAiCandidateContext(
    CandidateProfile Candidate,
    string JobAdvertisement,
    string Language);
