namespace CvDatabase.Api.Data.Entities;

public sealed class CandidateEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Title { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Location { get; set; } = "";
    public string Availability { get; set; } = "";
    public string CurrentAssignment { get; set; } = "";
    public DateOnly? AvailableFrom { get; set; }
    public int ExperienceYears { get; set; }
    public string AvatarDataUrl { get; set; } = "";
    public string[] Skills { get; set; } = [];
    public string[] Languages { get; set; } = [];
    public string Summary { get; set; } = "";
    public string Notes { get; set; } = "";
    public DateTimeOffset UpdatedAt { get; set; }
    public List<CandidateProjectEntity> Projects { get; set; } = [];
}
