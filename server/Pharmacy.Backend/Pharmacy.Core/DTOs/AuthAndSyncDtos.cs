namespace Pharmacy.Core.DTOs;

public record LoginRequestDto(string Username, string Password);

public record LoginResponseDto(
    string Token,
    string RefreshToken,
    string UserId,
    string Username,
    string FullName,
    string Role,
    string? BranchId,
    string? BranchName,
    DateTime ExpiresAt
);

public record SyncPushRequestDto(
    string BranchId,
    string ClientVersion,
    DateTime LastSyncTimestamp,
    List<SyncQueueItemDto> Items
);

public record SyncQueueItemDto(
    string Id,
    string EntityType,
    string EntityId,
    string Operation,
    string PayloadJson,
    long Version,
    DateTime Timestamp
);

public record SyncPushResultDto(
    bool Success,
    int ProcessedCount,
    int FailedCount,
    List<string> SyncedItemIds,
    List<SyncConflictDto> Conflicts
);

public record SyncConflictDto(
    string EntityType,
    string EntityId,
    string Resolution, // ServerWins, ClientWins, Merged
    string Details
);

public record SyncPullRequestDto(
    string BranchId,
    DateTime SinceTimestamp
);

public record SyncPullResponseDto(
    DateTime ServerTimestamp,
    List<object> UpdatedMedicines,
    List<object> UpdatedCustomers,
    List<object> UpdatedSuppliers,
    List<object> SystemSettings
);
