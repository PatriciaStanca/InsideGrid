using CvDatabase.Api.Data.Entities;

namespace CvDatabase.Api.Core.Interfaces;

public interface IJwtService
{
    (string Token, DateTimeOffset ExpiresAt) GenerateToken(AppUserEntity user);
}
