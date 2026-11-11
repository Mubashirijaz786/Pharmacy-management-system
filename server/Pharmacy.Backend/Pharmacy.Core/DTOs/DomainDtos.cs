namespace Pharmacy.Core.DTOs;

public record CreateSaleItemDto(
    string MedicineId,
    string? BatchNumber,
    int Quantity,
    decimal UnitPrice,
    decimal CostPrice,
    decimal Discount,
    decimal Total
);

public record CreateSaleDto(
    string BranchId,
    string? CustomerId,
    string? UserId,
    decimal SubTotal,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal ChangeAmount,
    string PaymentMethod,
    string PaymentStatus,
    string? Notes,
    List<CreateSaleItemDto> Items
);

public record MedicineDto(
    string Id,
    string Name,
    string? GenericName,
    string? Brand,
    string? Category,
    string? SubCategory,
    string? ProductGroup,
    string? Uom,
    string? Strength,
    string? Shelf,
    decimal CostPrice,
    decimal SellingPrice,
    string? Barcode,
    string DrugType,
    int ReorderLevel,
    int ConversionFactor,
    string? Manufacturer,
    int TotalStock,
    List<BatchDto> Batches
);

public record BatchDto(
    string Id,
    string BatchNumber,
    DateTime ExpiryDate,
    int Quantity,
    decimal PurchasePrice,
    decimal SellingPrice,
    string BranchId,
    string? Rack,
    string? Shelf
);

public record DashboardStatsDto(
    decimal TodaySales,
    int TodayTransactions,
    decimal TotalRevenue,
    decimal TotalProfit,
    int LowStockCount,
    int ExpiredCount,
    int ExpiringSoonCount,
    int PendingPrescriptionsCount
);

public record SalesReportDto(
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalSales,
    decimal TotalCost,
    decimal GrossProfit,
    decimal NetProfit,
    int InvoiceCount,
    List<DailySalesPointDto> DailyTrends
);

public record DailySalesPointDto(string Date, decimal Amount, int Invoices);
