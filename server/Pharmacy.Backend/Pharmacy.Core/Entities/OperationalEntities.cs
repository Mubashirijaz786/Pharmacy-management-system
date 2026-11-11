namespace Pharmacy.Core.Entities;

public class Prescription : BaseEntity
{
    public string PrescriptionNumber { get; set; } = string.Empty;
    public string? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public string PatientName { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string? HospitalClinic { get; set; }
    public string? FileUrl { get; set; } // Uploaded image or PDF path
    public string Status { get; set; } = "Pending"; // Pending, Verified, Dispensed, Rejected
    public string? PharmacistNotes { get; set; }
    public string? VerifiedByUserId { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

public class InventoryAdjustment : BaseEntity
{
    public string AdjustmentNumber { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string MedicineId { get; set; } = string.Empty;
    public Medicine? Medicine { get; set; }
    public string? BatchNumber { get; set; }
    public int QuantityAdjusted { get; set; } // Positive or negative
    public string Reason { get; set; } = "Damage"; // Damage, Expired, Loss, Manual Correction
    public string? AdjustedByUserId { get; set; }
    public string? Notes { get; set; }
}

public class Expense : BaseEntity
{
    public string ExpenseNumber { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public string Category { get; set; } = "General"; // Rent, Utilities, Salaries, Supplies
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
    public string? Description { get; set; }
    public string? RecordedByUserId { get; set; }
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
}

public class AuditLog : BaseEntity
{
    public string? UserId { get; set; }
    public string? Username { get; set; }
    public string Action { get; set; } = string.Empty; // Create, Update, Delete, Login, Sync
    public string EntityName { get; set; } = string.Empty; // Medicine, Sale, User, etc.
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
}

public class SyncQueue : BaseEntity
{
    public string EntityType { get; set; } = string.Empty; // Sale, Customer, Medicine, etc.
    public string EntityId { get; set; } = string.Empty;
    public string Operation { get; set; } = "INSERT"; // INSERT, UPDATE, DELETE
    public string PayloadJson { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING"; // PENDING, SYNCED, FAILED, CONFLICT
    public int RetryCount { get; set; } = 0;
    public string? ErrorMessage { get; set; }
    public string? BranchId { get; set; }
    public DateTime? SyncedAt { get; set; }
}
