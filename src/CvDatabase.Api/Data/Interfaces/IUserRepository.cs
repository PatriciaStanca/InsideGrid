using CvDatabase.Api.Data.Entities;

namespace CvDatabase.Api.Data.Interfaces;

public interface IUserRepository
{
    Task<AppUserEntity?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppUserEntity>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AppUserEntity> CreateAsync(AppUserEntity user, CancellationToken cancellationToken = default);
    Task UpdateAsync(AppUserEntity user, CancellationToken cancellationToken = default);
}
