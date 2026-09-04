using CvDatabase.Api.Data.Context;
using CvDatabase.Api.Data.Entities;
using CvDatabase.Api.Data.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CvDatabase.Api.Data.Repositories;

public sealed class EfUserRepository(CvDatabaseDbContext db) : IUserRepository
{
    public Task<AppUserEntity?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        return db.Users.FirstOrDefaultAsync(user => user.NormalizedEmail == normalizedEmail, cancellationToken);
    }

    public async Task<IReadOnlyList<AppUserEntity>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Users
            .AsNoTracking()
            .OrderBy(user => user.Email)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<AppUserEntity> CreateAsync(AppUserEntity user, CancellationToken cancellationToken = default)
    {
        user.NormalizedEmail = NormalizeEmail(user.Email);
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task UpdateAsync(AppUserEntity user, CancellationToken cancellationToken = default)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToUpperInvariant();
    }
}
