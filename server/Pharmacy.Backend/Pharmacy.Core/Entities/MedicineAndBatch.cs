namespace Pharmacy.Core.Entities;

public class Medicine : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? GenericName { get; set; }
    public string? Brand { get; set; }
    public string? Category { get; set; } // Tablet, Capsule, Syrup, Injection, etc.
    public string? SubCategory { get; set; }
    public string? ProductGroup { get; set; }
    public string? Uom { get; set; } // Unit of measure
    public string? Strength { get; set; } // e.g. 500mg
    public string? Shelf { get; set; } // Physical location/rack
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public string? Barcode { get; set; }
    public string DrugType { get; set; } = "OTC"; // OTC, Prescription-Only, Controlled
    public int ReorderLevel { get; set; } = 20;
    public int ConversionFactor { get; set; } = 10;
    public string? Manufacturer { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsRecalled { get; set; } = false;
    public string? AlternativesJson { get; set; } // JSON array of substitute names

    // Navigation
    public ICollection<Batch> Batches { get; set; } = new List<Batch>();
    public ICollection<SaleItem> SaleItems { get; set; } = new List<SaleItem>();
}

public class Batch : BaseEntity
{
    public string BatchNumber { get; set; } = string.Empty;
    public string MedicineId { get; set; } = string.Empty;
    public Medicine? Medicine { get; set; }

    public string BranchId { get; set; } = string.Empty;
    public Branch? Branch { get; set; }

    public DateTime ExpiryDate { get; set; }
    public int Quantity { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public string? Rack { get; set; }
    public string? Shelf { get; set; }
}
