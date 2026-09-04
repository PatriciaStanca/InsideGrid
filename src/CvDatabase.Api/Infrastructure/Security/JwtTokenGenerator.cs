using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CvDatabase.Api.Core.Interfaces;
using CvDatabase.Api.Data.Entities;
using Microsoft.IdentityModel.Tokens;

namespace CvDatabase.Api.Infrastructure.Security;

public sealed class JwtTokenGenerator(IConfiguration configuration) : IJwtService
{
    public (string Token, DateTimeOffset ExpiresAt) GenerateToken(AppUserEntity user)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var key = jwtSection["Key"] ?? throw new InvalidOperationException("Jwt:Key saknas.");
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(int.Parse(jwtSection["ExpiresMinutes"] ?? "60"));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
