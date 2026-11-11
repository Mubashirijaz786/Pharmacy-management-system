using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Pharmacy.Core.DTOs;
using Pharmacy.Infrastructure.Data;

namespace Pharmacy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly PharmacyDbContext _context;
    private readonly IConfiguration _config;

    public AuthController(PharmacyDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        var user = await _context.Users
            .Include(u => u.Branch)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower() && !u.IsDeleted);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { message = "Your account has been deactivated. Please contact admin." });
        }

        var expiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_config["JwtSettings:ExpiryMinutes"] ?? "1440"));
        var token = GenerateJwtToken(user, expiresAt);

        return Ok(new LoginResponseDto(
            Token: token,
            RefreshToken: Guid.NewGuid().ToString(),
            UserId: user.Id,
            Username: user.Username,
            FullName: user.FullName,
            Role: user.Role,
            BranchId: user.BranchId,
            BranchName: user.Branch?.Name,
            ExpiresAt: expiresAt
        ));
    }

    private string GenerateJwtToken(Core.Entities.User user, DateTime expiresAt)
    {
        var secret = _config["JwtSettings:Secret"] ?? "PharmacySecureSuperSecretKey2026!ForJwtTokens_Minimum32CharsLength";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("BranchId", user.BranchId ?? string.Empty),
            new Claim("FullName", user.FullName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["JwtSettings:Issuer"],
            audience: _config["JwtSettings:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
