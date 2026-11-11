using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.DTOs;
using Pharmacy.Core.Entities;
using Pharmacy.Infrastructure.Data;

namespace Pharmacy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MedicinesController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public MedicinesController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MedicineDto>>> GetMedicines([FromQuery] string? search, [FromQuery] string? branchId)
    {
        var query = _context.Medicines
            .Include(m => m.Batches)
            .Where(m => !m.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(m => m.Name.ToLower().Contains(s) || 
                                     (m.GenericName != null && m.GenericName.ToLower().Contains(s)) ||
                                     (m.Barcode != null && m.Barcode.Contains(s)) ||
                                     (m.Brand != null && m.Brand.ToLower().Contains(s)));
        }

        var list = await query.ToListAsync();

        var dtos = list.Select(m => new MedicineDto(
            Id: m.Id,
            Name: m.Name,
            GenericName: m.GenericName,
            Brand: m.Brand,
            Category: m.Category,
            SubCategory: m.SubCategory,
            ProductGroup: m.ProductGroup,
            Uom: m.Uom,
            Strength: m.Strength,
            Shelf: m.Shelf,
            CostPrice: m.CostPrice,
            SellingPrice: m.SellingPrice,
            Barcode: m.Barcode,
            DrugType: m.DrugType,
            ReorderLevel: m.ReorderLevel,
            ConversionFactor: m.ConversionFactor > 0 ? m.ConversionFactor : 10,
            Manufacturer: m.Manufacturer,
            TotalStock: m.Batches.Where(b => (string.IsNullOrEmpty(branchId) || b.BranchId == branchId) && !b.IsDeleted && b.ExpiryDate > DateTime.UtcNow).Sum(b => b.Quantity),
            Batches: m.Batches.Where(b => (string.IsNullOrEmpty(branchId) || b.BranchId == branchId) && !b.IsDeleted).Select(b => new BatchDto(
                Id: b.Id,
                BatchNumber: b.BatchNumber,
                ExpiryDate: b.ExpiryDate,
                Quantity: b.Quantity,
                PurchasePrice: b.PurchasePrice,
                SellingPrice: b.SellingPrice,
                BranchId: b.BranchId,
                Rack: b.Rack,
                Shelf: b.Shelf
            )).ToList()
        )).ToList();

        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MedicineDto>> GetMedicine(string id)
    {
        var m = await _context.Medicines
            .Include(x => x.Batches)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (m == null) return NotFound();

        return Ok(new MedicineDto(
            Id: m.Id,
            Name: m.Name,
            GenericName: m.GenericName,
            Brand: m.Brand,
            Category: m.Category,
            SubCategory: m.SubCategory,
            ProductGroup: m.ProductGroup,
            Uom: m.Uom,
            Strength: m.Strength,
            Shelf: m.Shelf,
            CostPrice: m.CostPrice,
            SellingPrice: m.SellingPrice,
            Barcode: m.Barcode,
            DrugType: m.DrugType,
            ReorderLevel: m.ReorderLevel,
            ConversionFactor: m.ConversionFactor > 0 ? m.ConversionFactor : 10,
            Manufacturer: m.Manufacturer,
            TotalStock: m.Batches.Where(b => !b.IsDeleted && b.ExpiryDate > DateTime.UtcNow).Sum(b => b.Quantity),
            Batches: m.Batches.Where(b => !b.IsDeleted).Select(b => new BatchDto(
                Id: b.Id,
                BatchNumber: b.BatchNumber,
                ExpiryDate: b.ExpiryDate,
                Quantity: b.Quantity,
                PurchasePrice: b.PurchasePrice,
                SellingPrice: b.SellingPrice,
                BranchId: b.BranchId,
                Rack: b.Rack,
                Shelf: b.Shelf
            )).ToList()
        ));
    }

    [HttpPost]
    public async Task<ActionResult> CreateMedicine([FromBody] Medicine medicine)
    {
        medicine.Id = string.IsNullOrEmpty(medicine.Id) ? Guid.NewGuid().ToString() : medicine.Id;
        medicine.CreatedAt = DateTime.UtcNow;
        medicine.UpdatedAt = DateTime.UtcNow;
        
        if (medicine.Batches != null)
        {
            foreach (var b in medicine.Batches)
            {
                b.Id = string.IsNullOrEmpty(b.Id) ? Guid.NewGuid().ToString() : b.Id;
                b.MedicineId = medicine.Id;
                b.CreatedAt = DateTime.UtcNow;
                b.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.Medicines.AddAsync(medicine);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMedicine), new { id = medicine.Id }, medicine);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateMedicine(string id, [FromBody] Medicine updated)
    {
        var existing = await _context.Medicines.Include(m => m.Batches).FirstOrDefaultAsync(m => m.Id == id);
        if (existing == null) return NotFound();

        existing.Name = updated.Name;
        existing.GenericName = updated.GenericName;
        existing.Brand = updated.Brand;
        existing.Category = updated.Category;
        existing.Strength = updated.Strength;
        existing.Uom = updated.Uom;
        existing.CostPrice = updated.CostPrice;
        existing.SellingPrice = updated.SellingPrice;
        existing.Barcode = updated.Barcode;
        existing.ReorderLevel = updated.ReorderLevel;
        existing.ConversionFactor = updated.ConversionFactor > 0 ? updated.ConversionFactor : existing.ConversionFactor;
        existing.Manufacturer = updated.Manufacturer;
        existing.Shelf = updated.Shelf;
        existing.IsDeleted = updated.IsDeleted;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.Version = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        if (updated.Batches != null && updated.Batches.Count > 0)
        {
            foreach (var ub in updated.Batches)
            {
                var match = existing.Batches.FirstOrDefault(b => b.BatchNumber == ub.BatchNumber && (string.IsNullOrEmpty(ub.BranchId) || b.BranchId == ub.BranchId));
                if (match != null)
                {
                    match.Quantity = ub.Quantity;
                    match.PurchasePrice = ub.PurchasePrice;
                    match.SellingPrice = ub.SellingPrice;
                    match.ExpiryDate = ub.ExpiryDate;
                    match.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    existing.Batches.Add(new Batch
                    {
                        Id = string.IsNullOrEmpty(ub.Id) ? Guid.NewGuid().ToString() : ub.Id,
                        MedicineId = id,
                        BatchNumber = ub.BatchNumber,
                        BranchId = string.IsNullOrEmpty(ub.BranchId) ? "BR001" : ub.BranchId,
                        Quantity = ub.Quantity,
                        PurchasePrice = ub.PurchasePrice,
                        SellingPrice = ub.SellingPrice,
                        ExpiryDate = ub.ExpiryDate,
                        Rack = ub.Rack,
                        Shelf = ub.Shelf,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<ActionResult> RestoreMedicine(string id)
    {
        var existing = await _context.Medicines.FindAsync(id);
        if (existing == null) return NotFound();

        existing.IsDeleted = false;
        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteMedicine(string id)
    {
        var existing = await _context.Medicines.FindAsync(id);
        if (existing == null) return NotFound();

        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
