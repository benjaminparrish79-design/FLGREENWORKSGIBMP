/**
 * FL-GreenGuard: Sync Manager Service
 * 
 * Coordinates offline-first synchronization with Supabase.
 * Manages sync queues, retry logic, and provides sync status updates.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncPendingLogs, getSyncStatus, type SyncError } from './audit-log-service';

const SYNC_QUEUE_KEY = 'fl_greenguard_sync_queue';
const SYNC_HISTORY_KEY = 'fl_greenguard_sync_history';
const LAST_SYNC_TIME_KEY = 'fl_greenguard_last_sync_time';

/**
 * Sync operation details
 */
export interface SyncOperation {
  id: string;
  timestamp: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  itemsCount: number;
  itemsSynced: number;
  itemsFailed: number;
  errors: SyncError[];
  duration?: number;
}

/**
 * Sync manager singleton
 */
class SyncManager {
  private syncInProgress: boolean = false;
  private syncListeners: Set<(operation: SyncOperation) => void> = new Set();

  /**
   * Start a sync operation
   */
  async startSync(userId: number): Promise<SyncOperation> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    const operation: SyncOperation = {
      id: `sync_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'in-progress',
      itemsCount: 0,
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
    };

    try {
      // Notify listeners
      this.notifyListeners(operation);

      // Perform sync
      const result = await syncPendingLogs(userId, 3);

      // Update operation
      operation.status = result.failed === 0 ? 'completed' : 'failed';
      operation.itemsSynced = result.synced;
      operation.itemsFailed = result.failed;
      operation.itemsCount = result.synced + result.failed;
      operation.errors = result.errors;
      operation.duration = Date.now() - startTime;

      // Save to history
      await this.saveSyncOperation(operation);

      // Update last sync time
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, new Date().toISOString());

      console.log(`[SyncManager] Sync completed: ${result.synced} synced, ${result.failed} failed`);
    } catch (error) {
      operation.status = 'failed';
      operation.duration = Date.now() - startTime;
      operation.errors.push({
        logId: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        attempt: 1,
      });

      console.error('[SyncManager] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners(operation);
    }

    return operation;
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
    } catch (error) {
      console.error('[SyncManager] Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 10): Promise<SyncOperation[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_HISTORY_KEY);
      if (!data) return [];

      const history = JSON.parse(data) as SyncOperation[];
      return history.slice(-limit).reverse();
    } catch (error) {
      console.error('[SyncManager] Error getting sync history:', error);
      return [];
    }
  }

  /**
   * Save sync operation to history
   */
  private async saveSyncOperation(operation: SyncOperation): Promise<void> {
    try {
      const history = await this.getSyncHistory(100);
      history.push(operation);

      // Keep only last 100 operations
      const trimmed = history.slice(-100);
      await AsyncStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[SyncManager] Error saving sync operation:', error);
    }
  }

  /**
   * Add a listener for sync operations
   */
  addListener(listener: (operation: SyncOperation) => void): () => void {
    this.syncListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(operation: SyncOperation): void {
    this.syncListeners.forEach((listener) => {
      try {
        listener(operation);
      } catch (error) {
        console.error('[SyncManager] Error notifying listener:', error);
      }
    });
  }

  /**
   * Clear sync history
   */
  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_HISTORY_KEY);
      await AsyncStorage.removeItem(LAST_SYNC_TIME_KEY);
    } catch (error) {
      console.error('[SyncManager] Error clearing history:', error);
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalItemsSynced: number;
    totalItemsFailed: number;
    lastSyncTime?: string;
  }> {
    try {
      const history = await this.getSyncHistory(100);
      const lastSyncTime = await this.getLastSyncTime();

      const stats = {
        totalSyncs: history.length,
        successfulSyncs: history.filter((op) => op.status === 'completed').length,
        failedSyncs: history.filter((op) => op.status === 'failed').length,
        totalItemsSynced: history.reduce((sum, op) => sum + op.itemsSynced, 0),
        totalItemsFailed: history.reduce((sum, op) => sum + op.itemsFailed, 0),
        lastSyncTime: lastSyncTime || undefined,
      };

      return stats;
    } catch (error) {
      console.error('[SyncManager] Error getting sync stats:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalItemsSynced: 0,
        totalItemsFailed: 0,
      };
    }
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

/**
 * Hook for React components to monitor sync operations
 */
export function useSyncManager() {
  const [operation, setOperation] = React.useState<SyncOperation | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = syncManager.addListener((op) => {
      setOperation(op);
      setIsLoading(op.status === 'in-progress');
    });

    return unsubscribe;
  }, []);

  return { operation, isLoading };
}
