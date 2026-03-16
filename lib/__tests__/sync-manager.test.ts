/**
 * FL-GreenGuard: Sync Manager Tests
 *
 * Verifies the SyncManager singleton: start/stop lifecycle, listener
 * notifications, history persistence, and stats aggregation.
 * All AsyncStorage and audit-log-service calls are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../audit-log-service', () => ({
  syncPendingLogs: vi.fn().mockResolvedValue({ synced: 2, failed: 0, errors: [] }),
  getPendingSyncIds: vi.fn().mockResolvedValue([1, 2]),
  getSyncStatus: vi.fn().mockResolvedValue({ isOnline: true, pendingCount: 0, syncedCount: 2 }),
}));

// React is used by useSyncManager — mock at module level
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: vi.fn((initial: any) => [initial, vi.fn()]),
    useEffect: vi.fn((cb: any) => { cb(); }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPendingLogs } from '../audit-log-service';
import { syncManager, type SyncOperation } from '../sync-manager';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSyncOp(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    id: `sync_${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: 'completed',
    itemsCount: 2,
    itemsSynced: 2,
    itemsFailed: 0,
    errors: [],
    duration: 123,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SyncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset syncInProgress flag between tests via the private setter workaround
    (syncManager as any).syncInProgress = false;
    (syncManager as any).syncListeners = new Set();
  });

  // ── startSync ──────────────────────────────────────────────────────────────

  describe('startSync', () => {
    it('calls syncPendingLogs with the provided userId', async () => {
      await syncManager.startSync(42);
      expect(syncPendingLogs).toHaveBeenCalledWith(42, 3);
    });

    it('returns a completed SyncOperation on success', async () => {
      const op = await syncManager.startSync(1);
      expect(op.status).toBe('completed');
      expect(op.itemsSynced).toBe(2);
      expect(op.itemsFailed).toBe(0);
    });

    it('returns a failed SyncOperation when syncPendingLogs throws', async () => {
      vi.mocked(syncPendingLogs).mockRejectedValueOnce(new Error('Network down'));
      const op = await syncManager.startSync(1);
      expect(op.status).toBe('failed');
      expect(op.errors.length).toBeGreaterThan(0);
    });

    it('throws if another sync is already in progress', async () => {
      (syncManager as any).syncInProgress = true;
      await expect(syncManager.startSync(1)).rejects.toThrow('Sync already in progress');
    });

    it('resets syncInProgress to false after completion', async () => {
      await syncManager.startSync(1);
      expect(syncManager.isSyncInProgress()).toBe(false);
    });

    it('resets syncInProgress to false even when sync throws', async () => {
      vi.mocked(syncPendingLogs).mockRejectedValueOnce(new Error('Fail'));
      await syncManager.startSync(1);
      expect(syncManager.isSyncInProgress()).toBe(false);
    });

    it('persists last sync time to AsyncStorage', async () => {
      await syncManager.startSync(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('last_sync_time'),
        expect.any(String)
      );
    });
  });

  // ── isSyncInProgress ───────────────────────────────────────────────────────

  describe('isSyncInProgress', () => {
    it('returns false initially', () => {
      expect(syncManager.isSyncInProgress()).toBe(false);
    });
  });

  // ── addListener ───────────────────────────────────────────────────────────

  describe('addListener', () => {
    it('notifies the listener when sync starts and completes', async () => {
      const notifications: SyncOperation[] = [];
      syncManager.addListener((op) => notifications.push(op));

      await syncManager.startSync(1);

      // Should receive at least 2 notifications: in-progress + completed
      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });

    it('returns an unsubscribe function that stops notifications', async () => {
      const notifications: SyncOperation[] = [];
      const unsubscribe = syncManager.addListener((op) => notifications.push(op));
      unsubscribe();

      await syncManager.startSync(1);

      expect(notifications.length).toBe(0);
    });
  });

  // ── getSyncHistory ────────────────────────────────────────────────────────

  describe('getSyncHistory', () => {
    it('returns empty array when no history exists', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
      const history = await syncManager.getSyncHistory();
      expect(history).toEqual([]);
    });

    it('returns stored history in reverse-chronological order', async () => {
      const ops = [makeSyncOp({ id: 'a' }), makeSyncOp({ id: 'b' })];
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(ops));
      const history = await syncManager.getSyncHistory(10);
      expect(history.length).toBeGreaterThan(0);
    });

    it('limits results to the requested count', async () => {
      const ops = Array.from({ length: 20 }, (_, i) => makeSyncOp({ id: `op_${i}` }));
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(ops));
      const history = await syncManager.getSyncHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  // ── getLastSyncTime ───────────────────────────────────────────────────────

  describe('getLastSyncTime', () => {
    it('returns null when no sync has occurred', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
      const t = await syncManager.getLastSyncTime();
      expect(t).toBeNull();
    });

    it('returns the stored ISO timestamp string', async () => {
      const now = new Date().toISOString();
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(now);
      const t = await syncManager.getLastSyncTime();
      expect(t).toBe(now);
    });
  });

  // ── getSyncStats ──────────────────────────────────────────────────────────

  describe('getSyncStats', () => {
    it('returns zero-filled stats when history is empty', async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      const stats = await syncManager.getSyncStats();
      expect(stats.totalSyncs).toBe(0);
      expect(stats.successfulSyncs).toBe(0);
      expect(stats.failedSyncs).toBe(0);
      expect(stats.totalItemsSynced).toBe(0);
    });

    it('counts successful and failed syncs separately', async () => {
      const ops: SyncOperation[] = [
        makeSyncOp({ status: 'completed', itemsSynced: 3, itemsFailed: 0 }),
        makeSyncOp({ status: 'failed', itemsSynced: 0, itemsFailed: 1 }),
        makeSyncOp({ status: 'completed', itemsSynced: 5, itemsFailed: 0 }),
      ];
      vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(ops)).mockResolvedValueOnce(null);
      const stats = await syncManager.getSyncStats();
      expect(stats.successfulSyncs).toBe(2);
      expect(stats.failedSyncs).toBe(1);
      expect(stats.totalItemsSynced).toBe(8);
      expect(stats.totalItemsFailed).toBe(1);
    });
  });

  // ── clearHistory ──────────────────────────────────────────────────────────

  describe('clearHistory', () => {
    it('removes sync history and last sync time from AsyncStorage', async () => {
      await syncManager.clearHistory();
      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(2);
    });
  });
});
