namespace Pharmacy.Core.Entities;

public class Sale : BaseEntity
{
    public string InvoiceNumber { get; set; } = string.Empty;
    public string BranchId { get; set; } = string.Empty;
    public Branch? Branch { get; set; }

    public string? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public string? UserId { get; set; }
    public User? User { get; set; }

    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    
    public string PaymentMethod { get; set; } = "Cash"; // Cash, Card, Credit, Split
    public string PaymentStatus { get; set; } = "Paid"; // Paid, Partial, Unpaid
    public string Status { get; set; } = "Completed"; // Completed, Returned, Voided
    public string? Notes { get; set; }

    public ICollection<SaleItem> Items { get; set; } = new List<SaleItem>();
    public ICollection<Return> Returns { get; set; } = new List<Return>();
}

public class SaleItem : BaseEntity
{
    public string SaleId { get; set; } = string.Empty;
    public Sale? Sale { get; set; }

    public string MedicineId { get; set; } = string.Empty;
    public Medicine? Medicine { get; set; }

    public string? BatchNumber { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
}

public class Return : BaseEntity
{
    public string ReturnNumber { get; set; } = string.Empty;
    public string SaleId { get; set; } = string.Empty;
    public Sale? Sale { get; set; }

    public string BranchId { get; set; } = string.Empty;
    public decimal RefundAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? ProcessedByUserId { get; set; }

    public ICollection<ReturnItem> Items { get; set; } = new List<ReturnItem>();
}

public class ReturnItem : BaseEntity
{
    public string ReturnId { get; set; } = string.Empty;
    public Return? Return { get; set; }

    public string MedicineId { get; set; } = string.Empty;
    public Medicine? Medicine { get; set; }

    public string? BatchNumber { get; set; }
    public int Quantity { get; set; }
    public decimal RefundPrice { get; set; }
    public decimal Total { get; set; }
}

public class Purchase : BaseEntity
{
    public string PurchaseNumber { get; set; } = string.Empty;
    public string SupplierId { get; set; } = string.Empty;
    public Supplier? Supplier { get; set; }

    public string BranchId { get; set; } = string.Empty;
    public Branch? Branch { get; set; }

    public string InvoiceNumber { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public string PaymentStatus { get; set; } = "Paid"; // Paid, Partial, Due
    public string Status { get; set; } = "Received"; // Ordered, Received, Cancelled
    public string? Notes { get; set; }

    public ICollection<PurchaseItem> Items { get; set; } = new List<PurchaseItem>();
}

public class PurchaseItem : BaseEntity
{
    public string PurchaseId { get; set; } = string.Empty;
    public Purchase? Purchase { get; set; }

    public string MedicineId { get; set; } = string.Empty;
    public Medicine? Medicine { get; set; }

    public string BatchNumber { get; set; } = string.Empty;
    public DateTime ExpiryDate { get; set; }
    public int Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal Total { get; set; }
}
