using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Pharmacy.API.Hubs;
using Pharmacy.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Database Context (Sqlite default, PostgreSQL / SqlServer switchable)
var dbProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? "Sqlite";
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                      ?? "Data Source=pharmacy_cloud.db";

builder.Services.AddDbContext<PharmacyDbContext>(options =>
{
    if (dbProvider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQLConnection"));
    }
    else if (dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
    {
        options.UseSqlServer(builder.Configuration.GetConnectionString("SqlServerConnection"));
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

// 2. Add JWT Authentication
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? "PharmacySecureSuperSecretKey2026!ForJwtTokens_Minimum32CharsLength";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("Staff", policy => policy.RequireRole("Admin", "Manager", "Pharmacist", "Cashier"));
});

// Explicitly bind HTTP server to port 5000 for local frontend & Electron connectivity
builder.WebHost.UseUrls("http://localhost:5000");

// 3. Add CORS (Allow all local development ports: 5173, 5174, Electron, etc.)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClientApps", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 4. Add SignalR for real-time cloud sync & alerts
builder.Services.AddSignalR();

// 5. Add Controllers and Swagger
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Pharmacy Management ERP & POS API",
        Version = "v1",
        Description = "Enterprise .NET 8 Backend with Offline-First Synchronization Engine"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 6. Seed Database on Startup (Purge dummy data & ensure clean state)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<PharmacyDbContext>();
        await DbInitializer.SeedAsync(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while initializing the database.");
    }
}

// 7. Configure HTTP pipeline
if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Pharmacy API v1"));
}

app.UseCors("AllowClientApps");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<PharmacyHub>("/hubs/pharmacy");

app.Run();
