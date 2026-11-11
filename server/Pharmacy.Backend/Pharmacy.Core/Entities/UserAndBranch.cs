namespace Pharmacy.Core.Entities;

public class Branch : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsHeadquarters { get; set; } = false;

    // Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Batch> Batches { get; set; } = new List<Batch>();
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
}

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = "Cashier"; // Admin, Cashier, Pharmacist, Manager
    public bool IsActive { get; set; } = true;
    public string? BranchId { get; set; }
    public Branch? Branch { get; set; }
}
