using Microsoft.AspNetCore.SignalR;

namespace Pharmacy.API.Hubs;

public class PharmacyHub : Hub
{
    public async Task JoinBranchGroup(string branchId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"Branch_{branchId}");
    }

    public async Task LeaveBranchGroup(string branchId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Branch_{branchId}");
    }

    public async Task BroadcastStockAlert(string branchId, string medicineName, int remainingQty)
    {
        await Clients.Group($"Branch_{branchId}").SendAsync("ReceiveStockAlert", new
        {
            MedicineName = medicineName,
            RemainingQty = remainingQty,
            Timestamp = DateTime.UtcNow
        });
    }
}
