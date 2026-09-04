namespace CvDatabase.Api.Data.DTOs;

public sealed record LoginRequestDto(string Email, string Password);

public sealed record RegisterUserRequestDto(
    string Email,
    string Password,
    string DisplayName,
    string Role);

public sealed record LoginResponseDto(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    UserDto User);

public sealed record UserDto(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    bool IsActive);
