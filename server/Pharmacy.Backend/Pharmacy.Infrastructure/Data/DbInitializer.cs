using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Pharmacy.Core.Entities;

namespace Pharmacy.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(PharmacyDbContext context)
    {
        try
        {
            var creator = context.Database.GetService<IDatabaseCreator>() as RelationalDatabaseCreator;
            if (creator != null)
            {
                try
                {
                    await creator.CreateTablesAsync();
                }
                catch
                {
                    // Tables already created
                }
            }
            else
            {
                await context.Database.EnsureCreatedAsync();
            }
        }
        catch
        {
            // Ignore if tables already exist
        }

        // 1. Seed Core Branches (Only if empty)
        if (!await context.Branches.AnyAsync())
        {
            var branches = new List<Branch>
            {
                new() { Id = "BR001", Code = "DWT", Name = "Downtown Branch", Address = "102 Main Street, City Center", Phone = "+1 (555) 019-2834", IsHeadquarters = true },
                new() { Id = "BR002", Code = "WST", Name = "Westside Clinic Branch", Address = "405 Medical Park Drive", Phone = "+1 (555) 014-9921" },
                new() { Id = "BR003", Code = "EST", Name = "Eastside Retail Branch", Address = "789 Commercial Plaza", Phone = "+1 (555) 018-4432" }
            };
            await context.Branches.AddRangeAsync(branches);
            await context.SaveChangesAsync();
        }

        // 2. Seed System Auth Users (Only if empty)
        if (!await context.Users.AnyAsync())
        {
            var users = new List<User>
            {
                new() { Id = "USR001", Username = "admin", PasswordHash = BCrypt.Net.BCrypt.HashPassword("123"), FullName = "System Admin", Role = "Admin", Email = "admin@pharmacy.com", BranchId = "BR001" },
                new() { Id = "USR002", Username = "cashier", PasswordHash = BCrypt.Net.BCrypt.HashPassword("123"), FullName = "Cashier User", Role = "Cashier", Email = "cashier@pharmacy.com", BranchId = "BR001" },
                new() { Id = "USR003", Username = "pharmacist", PasswordHash = BCrypt.Net.BCrypt.HashPassword("123"), FullName = "Pharmacist User", Role = "Pharmacist", Email = "pharmacist@pharmacy.com", BranchId = "BR001" },
                new() { Id = "USR004", Username = "manager", PasswordHash = BCrypt.Net.BCrypt.HashPassword("123"), FullName = "Manager User", Role = "Manager", Email = "manager@pharmacy.com", BranchId = "BR001" }
            };
            await context.Users.AddRangeAsync(users);
            await context.SaveChangesAsync();
        }

        // ZERO dummy medicines, batches, customers, suppliers, or sales!
        // All catalog data starts 100% clean and empty so the user enters real data.
    }

    public static async Task PurgeAllDataAsync(PharmacyDbContext context)
    {
        try
        {
            context.SaleItems.RemoveRange(context.SaleItems);
            context.Sales.RemoveRange(context.Sales);
            context.ReturnItems.RemoveRange(context.ReturnItems);
            context.Returns.RemoveRange(context.Returns);
            context.PurchaseItems.RemoveRange(context.PurchaseItems);
            context.Purchases.RemoveRange(context.Purchases);
            context.Batches.RemoveRange(context.Batches);
            context.Medicines.RemoveRange(context.Medicines);
            context.CustomerLedgers.RemoveRange(context.CustomerLedgers);
            context.Customers.RemoveRange(context.Customers);
            context.SupplierLedgers.RemoveRange(context.SupplierLedgers);
            context.Suppliers.RemoveRange(context.Suppliers);
            context.Prescriptions.RemoveRange(context.Prescriptions);
            context.Expenses.RemoveRange(context.Expenses);
            context.AuditLogs.RemoveRange(context.AuditLogs);
            context.SyncQueues.RemoveRange(context.SyncQueues);

            await context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Purge notice: {ex.Message}");
        }
    }
}
