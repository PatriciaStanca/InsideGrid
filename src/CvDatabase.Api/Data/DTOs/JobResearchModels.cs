namespace CvDatabase.Api.Data.DTOs;

public sealed record JobResearchRequest(
    Guid OrganizationId,
    string Title,
    string Department,
    string Location,
    string EmploymentType,
    string WorkspaceMode,
    string? CompanyWebsite,
    IReadOnlyList<string>? ResearchNotes,
    string? Message);

public sealed record ResearchSource(string Title, string Url);
public sealed record JobResearchResponse(string Reply, IReadOnlyList<ResearchSource> Sources);
public sealed record JobDescriptionResponse(string Description, IReadOnlyList<ResearchSource> Sources);
