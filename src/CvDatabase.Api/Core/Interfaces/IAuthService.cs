using CvDatabase.Api.Core.Common;
using CvDatabase.Api.Data.DTOs;

namespace CvDatabase.Api.Core.Interfaces;

public interface IAuthService
{
    Task<ServiceResult<LoginResponseDto>> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default);
    Task<ServiceResult<UserDto>> RegisterAsync(RegisterUserRequestDto request, CancellationToken cancellationToken = default);
    Task<ServiceResult<IReadOnlyList<UserDto>>> GetUsersAsync(CancellationToken cancellationToken = default);
}
