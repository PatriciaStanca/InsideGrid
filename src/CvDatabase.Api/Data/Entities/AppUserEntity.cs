namespace CvDatabase.Api.Data.Entities;

public sealed class AppUserEntity
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string NormalizedEmail { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
}
