namespace CvDatabase.Api.Data.Entities;

public sealed class CandidateProjectEntity
{
    public Guid Id { get; set; }
    public Guid CandidateId { get; set; }
    public CandidateEntity? Candidate { get; set; }
    public string Customer { get; set; } = "";
    public string Role { get; set; } = "";
    public string Description { get; set; } = "";
    public string[] Technologies { get; set; } = [];
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}
