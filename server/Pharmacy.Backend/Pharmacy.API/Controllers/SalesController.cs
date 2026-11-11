using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.DTOs;
using Pharmacy.Core.Entities;
using Pharmacy.Infrastructure.Data;

namespace Pharmacy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public SalesController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Sale>>> GetSales([FromQuery] string? branchId, [FromQuery] DateTime? fromDate)
    {
        var query = _context.Sales
            .Include(s => s.Items).ThenInclude(i => i.Medicine)
            .Include(s => s.Customer)
            .Include(s => s.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(branchId))
            query = query.Where(s => s.BranchId == branchId);

        if (fromDate.HasValue)
            query = query.Where(s => s.CreatedAt >= fromDate.Value);

        var sales = await query.OrderByDescending(s => s.CreatedAt).Take(200).ToListAsync();
        return Ok(sales);
    }

    [HttpPost]
    public async Task<ActionResult> CreateSale([FromBody] CreateSaleDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
            
            var sale = new Sale
            {
                Id = Guid.NewGuid().ToString(),
                InvoiceNumber = invoiceNumber,
                BranchId = dto.BranchId,
                CustomerId = dto.CustomerId,
                UserId = dto.UserId,
                SubTotal = dto.SubTotal,
                TaxAmount = dto.TaxAmount,
                DiscountAmount = dto.DiscountAmount,
                TotalAmount = dto.TotalAmount,
                PaidAmount = dto.PaidAmount,
                ChangeAmount = dto.ChangeAmount,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = dto.PaymentStatus,
                Status = "Completed",
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            foreach (var item in dto.Items)
            {
                var saleItem = new SaleItem
                {
                    Id = Guid.NewGuid().ToString(),
                    SaleId = sale.Id,
                    MedicineId = item.MedicineId,
                    BatchNumber = item.BatchNumber,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    CostPrice = item.CostPrice,
                    Discount = item.Discount,
                    Total = item.Total,
                    CreatedAt = DateTime.UtcNow
                };
                sale.Items.Add(saleItem);

                // Deduct from Batch Stock
                if (!string.IsNullOrEmpty(item.BatchNumber))
                {
                    var batch = await _context.Batches
                        .FirstOrDefaultAsync(b => b.MedicineId == item.MedicineId && 
                                                 b.BatchNumber == item.BatchNumber && 
                                                 b.BranchId == dto.BranchId);
                    if (batch != null)
                    {
                        batch.Quantity = Math.Max(0, batch.Quantity - item.Quantity);
                        batch.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            // If Customer Credit Sale, update Customer Ledger & Balance
            if (dto.PaymentMethod == "Credit" && !string.IsNullOrEmpty(dto.CustomerId))
            {
                var customer = await _context.Customers.FindAsync(dto.CustomerId);
                if (customer != null)
                {
                    var creditAmount = dto.TotalAmount - dto.PaidAmount;
                    customer.Balance += creditAmount;
                    customer.UpdatedAt = DateTime.UtcNow;

                    var ledger = new CustomerLedger
                    {
                        Id = Guid.NewGuid().ToString(),
                        CustomerId = customer.Id,
                        TransactionType = "Sale",
                        Debit = creditAmount,
                        Credit = 0,
                        Balance = customer.Balance,
                        ReferenceId = sale.InvoiceNumber,
                        Description = $"Credit Sale Invoice {sale.InvoiceNumber}",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.CustomerLedgers.AddAsync(ledger);
                }
            }

            await _context.Sales.AddAsync(sale);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { success = true, saleId = sale.Id, invoiceNumber = sale.InvoiceNumber, totalAmount = sale.TotalAmount });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteSale(string id)
    {
        var sale = await _context.Sales
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id || s.InvoiceNumber == id);

        if (sale == null)
            return Ok(new { success = true, message = "Sale already deleted or not found" });

        _context.SaleItems.RemoveRange(sale.Items);
        _context.Sales.Remove(sale);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = $"Sale {id} deleted successfully" });
    }
}
