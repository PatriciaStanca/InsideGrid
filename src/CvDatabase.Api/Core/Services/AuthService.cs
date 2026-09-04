using CvDatabase.Api.Core.Common;
using CvDatabase.Api.Core.Interfaces;
using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Entities;
using CvDatabase.Api.Data.Interfaces;
using CvDatabase.Api.Infrastructure.Security;

namespace CvDatabase.Api.Core.Services;

public sealed class AuthService(IUserRepository users, IJwtService jwt) : IAuthService
{
    public async Task<ServiceResult<LoginResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByEmailAsync(request.Email, cancellationToken);
        if (user is null || !user.IsActive || !PasswordService.Verify(request.Password, user.PasswordHash))
        {
            return ServiceResult<LoginResponseDto>.Fail(StatusCodes.Status401Unauthorized, "Fel e-post eller lösenord.");
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await users.UpdateAsync(user, cancellationToken);

        var token = jwt.GenerateToken(user);
        return ServiceResult<LoginResponseDto>.Ok(new LoginResponseDto(token.Token, token.ExpiresAt, ToDto(user)));
    }

    public async Task<ServiceResult<UserDto>> RegisterAsync(RegisterUserRequestDto request, CancellationToken cancellationToken = default)
    {
        if (!Roles.All.Contains(request.Role))
        {
            return ServiceResult<UserDto>.Fail(StatusCodes.Status400BadRequest, "Ogiltig roll.");
        }

        if (request.Password.Length < 10)
        {
            return ServiceResult<UserDto>.Fail(StatusCodes.Status400BadRequest, "Lösenordet måste vara minst 10 tecken.");
        }

        if (await users.GetByEmailAsync(request.Email, cancellationToken) is not null)
        {
            return ServiceResult<UserDto>.Fail(StatusCodes.Status409Conflict, "E-postadressen finns redan.");
        }

        var user = new AppUserEntity
        {
            Id = Guid.NewGuid(),
            Email = request.Email.Trim(),
            NormalizedEmail = request.Email.Trim().ToUpperInvariant(),
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = PasswordService.Hash(request.Password),
            Role = request.Role,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await users.CreateAsync(user, cancellationToken);
        return ServiceResult<UserDto>.Created(ToDto(user));
    }

    public async Task<ServiceResult<IReadOnlyList<UserDto>>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        var result = await users.GetAllAsync(cancellationToken);
        return ServiceResult<IReadOnlyList<UserDto>>.Ok(result.Select(ToDto).ToArray());
    }

    private static UserDto ToDto(AppUserEntity user)
    {
        return new UserDto(user.Id, user.Email, user.DisplayName, user.Role, user.IsActive);
    }
}
