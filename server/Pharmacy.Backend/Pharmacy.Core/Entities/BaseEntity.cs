namespace Pharmacy.Core.Entities;

public abstract class BaseEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
    public string? SyncStatus { get; set; } = "SYNCED"; // PENDING, SYNCED, CONFLICT
    public long Version { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}
