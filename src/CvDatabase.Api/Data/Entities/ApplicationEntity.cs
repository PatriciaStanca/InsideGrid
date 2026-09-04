namespace CvDatabase.Api.Data.Entities;

public sealed class ApplicationEntity
{
    public Guid Id { get; set; }
    public string Customer { get; set; } = "";
    public string Role { get; set; } = "";
    public string Advertisement { get; set; } = "";
    public string CandidateIds { get; set; } = "";
    public string CandidateNames { get; set; } = "";
    public string NormalizedFingerprint { get; set; } = "";
    public string Status { get; set; } = "";
    public string Feedback { get; set; } = "";
    public string SourceUrl { get; set; } = "";
    public string CreatedBy { get; set; } = "";
    public DateTimeOffset AppliedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
