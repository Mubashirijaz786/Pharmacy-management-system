using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.DTOs;
using Pharmacy.Infrastructure.Data;

namespace Pharmacy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public ReportsController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpGet("dashboard-stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats([FromQuery] string? branchId)
    {
        var today = DateTime.UtcNow.Date;

        var salesQuery = _context.Sales.Where(s => s.CreatedAt >= today);
        if (!string.IsNullOrEmpty(branchId))
            salesQuery = salesQuery.Where(s => s.BranchId == branchId);

        var todaySales = await salesQuery.SumAsync(s => s.TotalAmount);
        var todayTxCount = await salesQuery.CountAsync();

        var allSalesQuery = _context.Sales.AsQueryable();
        if (!string.IsNullOrEmpty(branchId))
            allSalesQuery = allSalesQuery.Where(s => s.BranchId == branchId);

        var totalRevenue = await allSalesQuery.SumAsync(s => s.TotalAmount);

        // Low stock count (medicines with stock <= reorderLevel)
        var medicines = await _context.Medicines.Include(m => m.Batches).Where(m => !m.IsDeleted).ToListAsync();
        var lowStockCount = medicines.Count(m => m.Batches.Where(b => (string.IsNullOrEmpty(branchId) || b.BranchId == branchId) && b.ExpiryDate > DateTime.UtcNow).Sum(b => b.Quantity) <= m.ReorderLevel);

        // Expired & Expiring soon count
        var now = DateTime.UtcNow;
        var in30Days = now.AddDays(30);
        var batches = await _context.Batches.Where(b => (string.IsNullOrEmpty(branchId) || b.BranchId == branchId) && !b.IsDeleted).ToListAsync();
        
        var expiredCount = batches.Count(b => b.ExpiryDate < now && b.Quantity > 0);
        var expiringSoonCount = batches.Count(b => b.ExpiryDate >= now && b.ExpiryDate <= in30Days && b.Quantity > 0);

        var pendingPrescriptions = await _context.Prescriptions.CountAsync(p => p.Status == "Pending");

        return Ok(new DashboardStatsDto(
            TodaySales: todaySales,
            TodayTransactions: todayTxCount,
            TotalRevenue: totalRevenue,
            TotalProfit: totalRevenue * 0.28m, // Estimated gross margin
            LowStockCount: lowStockCount,
            ExpiredCount: expiredCount,
            ExpiringSoonCount: expiringSoonCount,
            PendingPrescriptionsCount: pendingPrescriptions
        ));
    }
}
