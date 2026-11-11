using Microsoft.EntityFrameworkCore;
using Pharmacy.Core.Entities;

namespace Pharmacy.Infrastructure.Data;

public class PharmacyDbContext : DbContext
{
    public PharmacyDbContext(DbContextOptions<PharmacyDbContext> options) : base(options)
    {
    }

    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerLedger> CustomerLedgers => Set<CustomerLedger>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<SupplierLedger> SupplierLedgers => Set<SupplierLedger>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<Return> Returns => Set<Return>();
    public DbSet<ReturnItem> ReturnItems => Set<ReturnItem>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<InventoryAdjustment> InventoryAdjustments => Set<InventoryAdjustment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SyncQueue> SyncQueues => Set<SyncQueue>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Branch Indexes & Configuration
        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
        });

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasOne(e => e.Branch)
                  .WithMany(b => b.Users)
                  .HasForeignKey(e => e.BranchId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Medicine Configuration
        modelBuilder.Entity<Medicine>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Barcode);
            entity.HasIndex(e => e.Name);
            entity.Property(e => e.CostPrice).HasPrecision(18, 2);
            entity.Property(e => e.SellingPrice).HasPrecision(18, 2);
        });

        // Batch Configuration
        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MedicineId, e.BatchNumber, e.BranchId }).IsUnique();
            entity.Property(e => e.PurchasePrice).HasPrecision(18, 2);
            entity.Property(e => e.SellingPrice).HasPrecision(18, 2);
            
            entity.HasOne(e => e.Medicine)
                  .WithMany(m => m.Batches)
                  .HasForeignKey(e => e.MedicineId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Branch)
                  .WithMany(b => b.Batches)
                  .HasForeignKey(e => e.BranchId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Sale Configuration
        modelBuilder.Entity<Sale>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.InvoiceNumber).IsUnique();
            entity.Property(e => e.SubTotal).HasPrecision(18, 2);
            entity.Property(e => e.TaxAmount).HasPrecision(18, 2);
            entity.Property(e => e.DiscountAmount).HasPrecision(18, 2);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);
            entity.Property(e => e.PaidAmount).HasPrecision(18, 2);
            entity.Property(e => e.ChangeAmount).HasPrecision(18, 2);

            entity.HasOne(e => e.Branch)
                  .WithMany(b => b.Sales)
                  .HasForeignKey(e => e.BranchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Customer)
                  .WithMany(c => c.Sales)
                  .HasForeignKey(e => e.CustomerId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // SaleItem Configuration
        modelBuilder.Entity<SaleItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.CostPrice).HasPrecision(18, 2);
            entity.Property(e => e.Discount).HasPrecision(18, 2);
            entity.Property(e => e.Total).HasPrecision(18, 2);

            entity.HasOne(e => e.Sale)
                  .WithMany(s => s.Items)
                  .HasForeignKey(e => e.SaleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Customer & Supplier balances
        modelBuilder.Entity<Customer>(e =>
        {
            e.Property(c => c.Balance).HasPrecision(18, 2);
            e.Property(c => c.CreditLimit).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Supplier>(e =>
        {
            e.Property(s => s.Balance).HasPrecision(18, 2);
        });
    }
}
