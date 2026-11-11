using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Entities;
using Pharmacy.Infrastructure.Data;

namespace Pharmacy.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public CustomersController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers()
    {
        return Ok(await _context.Customers.Include(c => c.Ledgers).Where(c => !c.IsDeleted).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<Customer>> CreateCustomer([FromBody] Customer customer)
    {
        customer.Id = string.IsNullOrEmpty(customer.Id) ? Guid.NewGuid().ToString() : customer.Id;
        customer.CreatedAt = DateTime.UtcNow;
        customer.UpdatedAt = DateTime.UtcNow;
        await _context.Customers.AddAsync(customer);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCustomers), new { id = customer.Id }, customer);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Customer>> UpdateCustomer(string id, [FromBody] Customer updated)
    {
        var customer = await _context.Customers.FindAsync(id) ?? await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return NotFound();

        customer.Name = updated.Name;
        customer.Phone = updated.Phone;
        customer.Address = updated.Address;
        customer.Email = updated.Email;
        customer.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(customer);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteCustomer(string id)
    {
        var customer = await _context.Customers.FindAsync(id) ?? await _context.Customers.FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return NotFound();

        var ledgers = _context.CustomerLedgers.Where(l => l.CustomerId == id);
        _context.CustomerLedgers.RemoveRange(ledgers);
        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Customer deleted successfully." });
    }
}

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public SuppliersController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Supplier>>> GetSuppliers()
    {
        return Ok(await _context.Suppliers.Include(s => s.Ledgers).Where(s => !s.IsDeleted).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<Supplier>> CreateSupplier([FromBody] Supplier supplier)
    {
        supplier.Id = string.IsNullOrEmpty(supplier.Id) ? Guid.NewGuid().ToString() : supplier.Id;
        supplier.CreatedAt = DateTime.UtcNow;
        supplier.UpdatedAt = DateTime.UtcNow;
        await _context.Suppliers.AddAsync(supplier);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSuppliers), new { id = supplier.Id }, supplier);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Supplier>> UpdateSupplier(string id, [FromBody] Supplier updated)
    {
        var supplier = await _context.Suppliers.FindAsync(id) ?? await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id);
        if (supplier == null) return NotFound();

        supplier.Name = updated.Name;
        supplier.Company = updated.Company;
        supplier.Contact = updated.Contact;
        supplier.Address = updated.Address;
        supplier.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(supplier);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteSupplier(string id)
    {
        var supplier = await _context.Suppliers.FindAsync(id) ?? await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id);
        if (supplier == null) return NotFound();

        var ledgers = _context.SupplierLedgers.Where(l => l.SupplierId == id);
        _context.SupplierLedgers.RemoveRange(ledgers);
        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Supplier deleted successfully." });
    }
}

[ApiController]
[Route("api/[controller]")]
public class BranchesController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public BranchesController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Branch>>> GetBranches()
    {
        return Ok(await _context.Branches.Where(b => !b.IsDeleted).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<Branch>> CreateBranch([FromBody] Branch branch)
    {
        branch.Id = string.IsNullOrEmpty(branch.Id) ? Guid.NewGuid().ToString() : branch.Id;
        branch.CreatedAt = DateTime.UtcNow;
        branch.UpdatedAt = DateTime.UtcNow;
        await _context.Branches.AddAsync(branch);
        await _context.SaveChangesAsync();
        return Ok(branch);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Branch>> UpdateBranch(string id, [FromBody] Branch updated)
    {
        var branch = await _context.Branches.FindAsync(id) ?? await _context.Branches.FirstOrDefaultAsync(b => b.Id == id);
        if (branch == null) return NotFound();

        branch.Name = updated.Name;
        branch.Code = updated.Code;
        branch.Address = updated.Address;
        branch.Phone = updated.Phone;
        branch.IsHeadquarters = updated.IsHeadquarters;
        branch.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(branch);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteBranch(string id)
    {
        var branch = await _context.Branches.FindAsync(id) ?? await _context.Branches.FirstOrDefaultAsync(b => b.Id == id);
        if (branch == null) return NotFound();

        _context.Branches.Remove(branch);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}

[ApiController]
[Route("api/[controller]")]
public class PrescriptionsController : ControllerBase
{
    private readonly PharmacyDbContext _context;

    public PrescriptionsController(PharmacyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Prescription>>> GetPrescriptions()
    {
        return Ok(await _context.Prescriptions.Include(p => p.Customer).OrderByDescending(p => p.CreatedAt).ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult> CreatePrescription([FromBody] Prescription p)
    {
        p.Id = string.IsNullOrEmpty(p.Id) ? Guid.NewGuid().ToString() : p.Id;
        p.CreatedAt = DateTime.UtcNow;
        p.UpdatedAt = DateTime.UtcNow;
        await _context.Prescriptions.AddAsync(p);
        await _context.SaveChangesAsync();
        return Ok(p);
    }

    [HttpPut("{id}/verify")]
    public async Task<ActionResult> VerifyPrescription(string id, [FromBody] string pharmacistNotes)
    {
        var p = await _context.Prescriptions.FindAsync(id);
        if (p == null) return NotFound();

        p.Status = "Verified";
        p.PharmacistNotes = pharmacistNotes;
        p.VerifiedAt = DateTime.UtcNow;
        p.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(p);
    }
}
