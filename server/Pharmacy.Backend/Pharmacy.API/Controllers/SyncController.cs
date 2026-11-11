using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.DTOs;
using Pharmacy.Core.Entities;
using Pharmacy.Infrastructure.Data;

namespace Pharmacy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncController : ControllerBase
{
    private readonly PharmacyDbContext _context;
    private readonly ILogger<SyncController> _logger;

    public SyncController(PharmacyDbContext context, ILogger<SyncController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost("push")]
    public async Task<ActionResult<SyncPushResultDto>> PushOfflineChanges([FromBody] SyncPushRequestDto request)
    {
        var syncedIds = new List<string>();
        var conflicts = new List<SyncConflictDto>();
        int processed = 0;
        int failed = 0;

        foreach (var item in request.Items)
        {
            try
            {
                var itemTime = DateTime.SpecifyKind(item.Timestamp, DateTimeKind.Utc);

                if (item.Operation.Equals("DELETE", StringComparison.OrdinalIgnoreCase))
                {
                    switch (item.EntityType.ToUpper())
                    {
                        case "SUPPLIER":
                            var supDel = await _context.Suppliers.FindAsync(item.EntityId) ?? await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == item.EntityId);
                            if (supDel != null)
                            {
                                var ledgers = _context.SupplierLedgers.Where(l => l.SupplierId == item.EntityId);
                                _context.SupplierLedgers.RemoveRange(ledgers);
                                _context.Suppliers.Remove(supDel);
                            }
                            break;

                        case "SALE":
                            var saleDel = await _context.Sales.Include(s => s.Items).FirstOrDefaultAsync(s => s.Id == item.EntityId || s.InvoiceNumber == item.EntityId);
                            if (saleDel != null)
                            {
                                _context.SaleItems.RemoveRange(saleDel.Items);
                                _context.Sales.Remove(saleDel);
                            }
                            break;

                        case "CUSTOMER":
                            var custDel = await _context.Customers.FindAsync(item.EntityId) ?? await _context.Customers.FirstOrDefaultAsync(c => c.Id == item.EntityId);
                            if (custDel != null)
                            {
                                var ledgers = _context.CustomerLedgers.Where(l => l.CustomerId == item.EntityId);
                                _context.CustomerLedgers.RemoveRange(ledgers);
                                _context.Customers.Remove(custDel);
                            }
                            break;

                        case "MEDICINE":
                            var medDel = await _context.Medicines.FindAsync(item.EntityId) ?? await _context.Medicines.FirstOrDefaultAsync(m => m.Id == item.EntityId);
                            if (medDel != null)
                            {
                                var batches = _context.Batches.Where(b => b.MedicineId == item.EntityId);
                                _context.Batches.RemoveRange(batches);
                                _context.Medicines.Remove(medDel);
                            }
                            break;
                    }
                }
                else
                {
                    switch (item.EntityType.ToUpper())
                    {
                        case "SALE":
                            var saleDto = JsonSerializer.Deserialize<CreateSaleDto>(item.PayloadJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (saleDto != null)
                            {
                                var targetInvNo = item.EntityId;
                                var existingSale = await _context.Sales
                                    .Include(s => s.Items)
                                    .FirstOrDefaultAsync(s => s.Id == item.EntityId || s.InvoiceNumber == targetInvNo);

                                if (existingSale == null)
                                {
                                    var sale = new Sale
                                    {
                                        Id = item.EntityId,
                                        InvoiceNumber = targetInvNo,
                                        BranchId = request.BranchId,
                                        CustomerId = saleDto.CustomerId,
                                        UserId = saleDto.UserId,
                                        SubTotal = saleDto.SubTotal,
                                        TaxAmount = saleDto.TaxAmount,
                                        DiscountAmount = saleDto.DiscountAmount,
                                        TotalAmount = saleDto.TotalAmount,
                                        PaidAmount = saleDto.PaidAmount,
                                        ChangeAmount = saleDto.ChangeAmount,
                                        PaymentMethod = saleDto.PaymentMethod,
                                        PaymentStatus = saleDto.PaymentStatus,
                                        CreatedAt = itemTime,
                                        UpdatedAt = DateTime.UtcNow
                                    };

                                    if (saleDto.Items != null)
                                    {
                                        foreach (var si in saleDto.Items)
                                        {
                                            sale.Items.Add(new SaleItem
                                            {
                                                Id = Guid.NewGuid().ToString(),
                                                SaleId = sale.Id,
                                                MedicineId = si.MedicineId,
                                                BatchNumber = si.BatchNumber,
                                                Quantity = si.Quantity,
                                                UnitPrice = si.UnitPrice,
                                                CostPrice = si.CostPrice,
                                                Discount = si.Discount,
                                                Total = si.Total
                                            });

                                            // Deduct stock
                                            if (!string.IsNullOrEmpty(si.BatchNumber))
                                            {
                                                var batch = await _context.Batches.FirstOrDefaultAsync(b => b.MedicineId == si.MedicineId && b.BatchNumber == si.BatchNumber && b.BranchId == request.BranchId);
                                                if (batch != null)
                                                {
                                                    batch.Quantity = Math.Max(0, batch.Quantity - si.Quantity);
                                                    batch.UpdatedAt = DateTime.UtcNow;
                                                }
                                            }
                                        }
                                    }

                                    await _context.Sales.AddAsync(sale);
                                }
                                else
                                {
                                    existingSale.SubTotal = saleDto.SubTotal;
                                    existingSale.TotalAmount = saleDto.TotalAmount;
                                    existingSale.PaidAmount = saleDto.PaidAmount;
                                    existingSale.PaymentStatus = saleDto.PaymentStatus;
                                    existingSale.UpdatedAt = DateTime.UtcNow;
                                }
                            }
                            break;

                        case "CUSTOMER":
                            var cust = JsonSerializer.Deserialize<Customer>(item.PayloadJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (cust != null)
                            {
                                var existingCust = await _context.Customers.FindAsync(cust.Id);
                                if (existingCust == null)
                                {
                                    cust.CreatedAt = itemTime;
                                    cust.UpdatedAt = DateTime.UtcNow;
                                    await _context.Customers.AddAsync(cust);
                                }
                                else
                                {
                                    existingCust.Name = cust.Name;
                                    existingCust.Phone = cust.Phone;
                                    existingCust.Balance = cust.Balance;
                                    existingCust.UpdatedAt = DateTime.UtcNow;
                                }
                            }
                            break;

                        case "SUPPLIER":
                            var sup = JsonSerializer.Deserialize<Supplier>(item.PayloadJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (sup != null)
                            {
                                var existingSup = await _context.Suppliers.FindAsync(sup.Id);
                                if (existingSup == null)
                                {
                                    sup.CreatedAt = itemTime;
                                    sup.UpdatedAt = DateTime.UtcNow;
                                    await _context.Suppliers.AddAsync(sup);
                                }
                                else
                                {
                                    existingSup.Name = sup.Name;
                                    existingSup.Phone = sup.Phone;
                                    existingSup.Balance = sup.Balance;
                                    existingSup.UpdatedAt = DateTime.UtcNow;
                                }
                            }
                            break;

                        case "MEDICINE":
                            var med = JsonSerializer.Deserialize<Medicine>(item.PayloadJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (med != null)
                            {
                                var existingMed = await _context.Medicines.FindAsync(med.Id);
                                if (existingMed == null)
                                {
                                    med.CreatedAt = itemTime;
                                    med.UpdatedAt = DateTime.UtcNow;
                                    await _context.Medicines.AddAsync(med);
                                }
                                else
                                {
                                    existingMed.Name = med.Name;
                                    existingMed.SellingPrice = med.SellingPrice;
                                    existingMed.CostPrice = med.CostPrice;
                                    existingMed.IsDeleted = false;
                                    existingMed.UpdatedAt = DateTime.UtcNow;
                                }
                            }
                            break;
                    }
                }

                await _context.SaveChangesAsync();
                syncedIds.Add(item.Id);
                processed++;
            }
            catch (Exception ex)
            {
                failed++;
                _logger.LogError(ex, "Failed to sync item {Id}", item.Id);
                conflicts.Add(new SyncConflictDto(item.EntityType, item.EntityId, "Failed", ex.Message));
                _context.ChangeTracker.Clear();
            }
        }

        return Ok(new SyncPushResultDto(
            Success: failed == 0,
            ProcessedCount: processed,
            FailedCount: failed,
            SyncedItemIds: syncedIds,
            Conflicts: conflicts
        ));
    }

    [HttpGet("pull")]
    public async Task<ActionResult<SyncPullResponseDto>> PullCloudUpdates([FromQuery] string branchId, [FromQuery] DateTime? since)
    {
        var sinceTime = since.HasValue ? DateTime.SpecifyKind(since.Value, DateTimeKind.Utc) : DateTime.UnixEpoch;

        var updatedMedicines = await _context.Medicines
            .Include(m => m.Batches)
            .Where(m => m.UpdatedAt >= sinceTime)
            .ToListAsync();

        var updatedCustomers = await _context.Customers
            .Where(c => c.UpdatedAt >= sinceTime)
            .ToListAsync();

        var updatedSuppliers = await _context.Suppliers
            .Where(s => s.UpdatedAt >= sinceTime)
            .ToListAsync();

        return Ok(new SyncPullResponseDto(
            ServerTimestamp: DateTime.UtcNow,
            UpdatedMedicines: updatedMedicines.Cast<object>().ToList(),
            UpdatedCustomers: updatedCustomers.Cast<object>().ToList(),
            UpdatedSuppliers: updatedSuppliers.Cast<object>().ToList(),
            SystemSettings: new List<object>()
        ));
    }
}
