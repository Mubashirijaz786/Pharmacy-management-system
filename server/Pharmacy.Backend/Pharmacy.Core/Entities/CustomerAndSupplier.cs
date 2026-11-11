using System.ComponentModel.DataAnnotations.Schema;

namespace Pharmacy.Core.Entities;

public class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public decimal Balance { get; set; } = 0; // Negative = Credit balance
    public decimal CreditLimit { get; set; } = 5000;
    public int LoyaltyPoints { get; set; } = 0;

    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    public ICollection<CustomerLedger> Ledgers { get; set; } = new List<CustomerLedger>();
}

public class CustomerLedger : BaseEntity
{
    public string CustomerId { get; set; } = string.Empty;
    public Customer? Customer { get; set; }
    public string TransactionType { get; set; } = "Sale"; // Sale, Payment, Refund, Adjustment
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
    public string? ReferenceId { get; set; }
    public string? Description { get; set; }
}

public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    [NotMapped]
    public string? Company { get => ContactPerson; set => ContactPerson = value; }

    [NotMapped]
    public string? Contact { get => Phone; set => Phone = value; }

    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? TaxNumber { get; set; }
    public decimal Balance { get; set; } = 0; // Amount payable to supplier

    public ICollection<Purchase> Purchases { get; set; } = new List<Purchase>();
    public ICollection<SupplierLedger> Ledgers { get; set; } = new List<SupplierLedger>();
}

public class SupplierLedger : BaseEntity
{
    public string SupplierId { get; set; } = string.Empty;
    public Supplier? Supplier { get; set; }
    public string TransactionType { get; set; } = "Purchase"; // Purchase, Payment, Return
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public decimal Balance { get; set; }
    public string? ReferenceId { get; set; }
    public string? Description { get; set; }
}
