using CvDatabase.Api.Data.Entities;
using CvDatabase.Api.Data.Interfaces;
using CvDatabase.Api.Infrastructure.Security;

namespace CvDatabase.Api.Data.Repositories;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly object _gate = new();
    private readonly List<AppUserEntity> _users =
    [
        new()
        {
            Id = Guid.Parse("bf2e0b22-a975-437d-9a89-94a85ef9a001"),
            Email = "admin@cvdatabase.local",
            NormalizedEmail = "ADMIN@CVDATABASE.LOCAL",
            DisplayName = "Admin",
            PasswordHash = PasswordService.Hash("Admin123!"),
            Role = Roles.Admin,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        },
        new()
        {
            Id = Guid.Parse("bf2e0b22-a975-437d-9a89-94a85ef9a002"),
            Email = "manager@cvdatabase.local",
            NormalizedEmail = "MANAGER@CVDATABASE.LOCAL",
            DisplayName = "Manager",
            PasswordHash = PasswordService.Hash("Manager123!"),
            Role = Roles.Manager,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        },
        new()
        {
            Id = Guid.Parse("bf2e0b22-a975-437d-9a89-94a85ef9a003"),
            Email = "employee@cvdatabase.local",
            NormalizedEmail = "EMPLOYEE@CVDATABASE.LOCAL",
            DisplayName = "Employee",
            PasswordHash = PasswordService.Hash("Employee123!"),
            Role = Roles.Employee,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        }
    ];

    public Task<AppUserEntity?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        lock (_gate)
        {
            return Task.FromResult(_users.FirstOrDefault(user => user.NormalizedEmail == normalizedEmail));
        }
    }

    public Task<IReadOnlyList<AppUserEntity>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            return Task.FromResult<IReadOnlyList<AppUserEntity>>(_users.OrderBy(user => user.Email).ToArray());
        }
    }

    public Task<AppUserEntity> CreateAsync(AppUserEntity user, CancellationToken cancellationToken = default)
    {
        user.NormalizedEmail = NormalizeEmail(user.Email);
        lock (_gate)
        {
            _users.Add(user);
        }

        return Task.FromResult(user);
    }

    public Task UpdateAsync(AppUserEntity user, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            var index = _users.FindIndex(existing => existing.Id == user.Id);
            if (index >= 0)
            {
                _users[index] = user;
            }
        }

        return Task.CompletedTask;
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim().ToUpperInvariant();
    }
}
