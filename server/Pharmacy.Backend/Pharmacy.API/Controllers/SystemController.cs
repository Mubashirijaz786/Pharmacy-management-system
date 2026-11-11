using Microsoft.AspNetCore.Mvc;
using Pharmacy.Infrastructure.Data;

namespace Pharmacy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public SystemController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpPost("clear-all-data")]
    public async Task<ActionResult> ClearAllData()
    {
        await DbInitializer.PurgeAllDataAsync(_context);
        return Ok(new { success = true, message = "All medicines, batches, sales, customers, and suppliers have been purged from database. System is 100% clean." });
    }
}
