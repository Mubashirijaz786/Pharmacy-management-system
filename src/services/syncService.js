import api, { API_BASE_URL } from "./api";

const QUEUE_STORAGE_KEY = "pharmacy_sync_queue";
const LAST_SYNC_KEY = "pharmacy_last_sync_timestamp";

class SyncService {
  constructor() {
    this.isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    this.isSyncing = false;
    this.lastSyncTime = localStorage.getItem(LAST_SYNC_KEY) || null;
    this.subscribers = new Set();
    this.timerId = null;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
  }

  // Subscribe to sync state changes
  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.getStatus());
    return () => this.subscribers.delete(callback);
  }

  notify() {
    const status = this.getStatus();
    this.subscribers.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.error("Sync subscriber error:", err);
      }
    });
  }

  getStatus() {
    const queue = this.getQueue();
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: queue.length,
      lastSyncTime: this.lastSyncTime
    };
  }

  getQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveQueue(queue) {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    this.notify();
  }

  // Enqueue an offline action (Sale, Customer, Stock change)
  enqueue(entityType, entityId, operation, payload) {
    const queue = this.getQueue();
    const item = {
      id: "SYNC-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      entityType,
      entityId,
      operation,
      payloadJson: typeof payload === "string" ? payload : JSON.stringify(payload),
      version: Date.now(),
      timestamp: new Date().toISOString()
    };

    queue.push(item);
    this.saveQueue(queue);
    console.log(`[SyncQueue] Enqueued ${operation} for ${entityType}:${entityId}. Total pending: ${queue.length}`);

    // If online, trigger auto sync immediately in background
    if (this.isOnline && !this.isSyncing) {
      this.syncNow().catch(() => {});
    }

    return item;
  }

  async handleNetworkChange(online) {
    this.isOnline = online;
    console.log(`[SyncService] Network status changed: ${online ? "ONLINE 🟢" : "OFFLINE 🔴"}`);
    this.notify();

    if (online) {
      await this.syncNow();
    }
  }

  // Start background auto sync loop
  startAutoSync(intervalMs = 30000) {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow().catch(() => {});
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // Trigger manual or automated Bidirectional Delta Sync
  async syncNow() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notify();

    try {
      // Step 1: Health / Connectivity Check
      const isServerReachable = await this.checkServerConnectivity();
      if (!isServerReachable) {
        this.isOnline = false;
        this.isSyncing = false;
        this.notify();
        return { success: false, reason: "Server unreachable" };
      }

      this.isOnline = true;
      const queue = this.getQueue();

      // Step 2: Push pending offline changes to Cloud .NET API
      if (queue.length > 0) {
        console.log(`[SyncService] Uploading ${queue.length} pending items to .NET API...`);
        const currentBranch = JSON.parse(localStorage.getItem("pharmacy_currentBranch") || "{}");

        const pushPayload = {
          branchId: currentBranch.id || "BR001",
          clientVersion: "1.0.0",
          lastSyncTimestamp: this.lastSyncTime || new Date(0).toISOString(),
          items: queue
        };

        const pushResponse = await api.post("/sync/push", pushPayload);
        if (pushResponse.data && pushResponse.data.syncedItemIds) {
          const syncedIds = new Set(pushResponse.data.syncedItemIds);
          const remainingQueue = queue.filter((item) => !syncedIds.has(item.id));
          this.saveQueue(remainingQueue);
          console.log(`[SyncService] Successfully synced ${syncedIds.size} items. Remaining: ${remainingQueue.length}`);
        }
      }

      // Step 3: Pull fresh cloud changes (Master medicines, prices, suppliers)
      const currentBranch = JSON.parse(localStorage.getItem("pharmacy_currentBranch") || "{}");
      const pullResponse = await api.get("/sync/pull", {
        params: {
          branchId: currentBranch.id || "BR001",
          since: this.lastSyncTime
        }
      });

      if (pullResponse.data) {
        this.lastSyncTime = pullResponse.data.serverTimestamp || new Date().toISOString();
        localStorage.setItem(LAST_SYNC_KEY, this.lastSyncTime);
      }

      this.isSyncing = false;
      this.notify();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("pharmacy_sync_completed", { detail: pullResponse?.data }));
      }

      return { success: true, timestamp: this.lastSyncTime };
    } catch (error) {
      console.warn("[SyncService] Sync cycle encountered an error (Operating Offline):", error.message);
      this.isSyncing = false;
      this.notify();
      return { success: false, error: error.message };
    }
  }

  async checkServerConnectivity() {
    try {
      const response = await api.get("/branches", { timeout: 8000 }).catch(() => null);
      return response !== null && response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }
}

export const syncService = new SyncService();
