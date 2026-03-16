/**
 * FL-GreenGuard: Network Status Service
 * 
 * Monitors network connectivity and triggers sync operations when online.
 * Provides offline-first functionality with automatic sync when connection is restored.
 */

import React from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingLogs, getPendingSyncIds } from './audit-log-service';

type NetworkStatusListener = (isOnline: boolean) => void;

/**
 * Network status service singleton
 */
class NetworkStatusService {
  private listeners: Set<NetworkStatusListener> = new Set();
  private isOnline: boolean = true;
  private unsubscribe: (() => void) | null = null;
  private syncInProgress: boolean = false;
  private syncRetryCount: number = 0;
  private maxSyncRetries: number = 3;
  private syncRetryDelay: number = 5000; // 5 seconds

  /**
   * Initialize network status monitoring
   */
  async initialize(): Promise<void> {
    try {
      // Get initial state
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;

      // Subscribe to changes
      this.unsubscribe = NetInfo.addEventListener((state) => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;

        // Notify listeners of status change
        this.notifyListeners(this.isOnline);

        // Trigger sync if coming online
        if (!wasOnline && this.isOnline) {
          console.log('[Network] Connection restored, triggering sync');
          this.triggerSync();
        }
      });

      console.log(`[Network] Initialized. Current status: ${this.isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('[Network] Failed to initialize:', error);
    }
  }

  /**
   * Cleanup network monitoring
   */
  cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Get current online status
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Add a listener for network status changes
   */
  addListener(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach((listener) => {
      try {
        listener(isOnline);
      } catch (error) {
        console.error('[Network] Error notifying listener:', error);
      }
    });
  }

  /**
   * Trigger sync with retry logic
   */
  private async triggerSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[Network] Sync already in progress, skipping');
      return;
    }

    this.syncInProgress = true;
    this.syncRetryCount = 0;

    try {
      await this.performSync();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Perform sync with retry logic
   */
  private async performSync(): Promise<void> {
    try {
      const pendingIds = await getPendingSyncIds();

      if (pendingIds.length === 0) {
        console.log('[Network] No pending logs to sync');
        return;
      }

      console.log(`[Network] Starting sync of ${pendingIds.length} pending logs`);

      // Resolve the real authenticated user ID at sync time
      const { getCurrentUserId } = await import('./auth-helpers');
      const userId = await getCurrentUserId();
      if (!userId) {
        console.warn('[Network] No authenticated user — skipping sync');
        return;
      }

      const result = await syncPendingLogs(userId, 3);

      console.log(`[Network] Sync completed: ${result.synced} synced, ${result.failed} failed`);

      if (result.failed > 0 && this.syncRetryCount < this.maxSyncRetries) {
        this.syncRetryCount++;
        console.log(
          `[Network] Sync failed, scheduling retry ${this.syncRetryCount}/${this.maxSyncRetries}`
        );

        // Schedule retry
        setTimeout(() => {
          if (this.isOnline) {
            this.performSync();
          }
        }, this.syncRetryDelay * this.syncRetryCount);
      }
    } catch (error) {
      console.error('[Network] Sync error:', error);

      if (this.syncRetryCount < this.maxSyncRetries) {
        this.syncRetryCount++;
        console.log(
          `[Network] Sync error, scheduling retry ${this.syncRetryCount}/${this.maxSyncRetries}`
        );

        // Schedule retry
        setTimeout(() => {
          if (this.isOnline) {
            this.performSync();
          }
        }, this.syncRetryDelay * this.syncRetryCount);
      }
    }
  }

  /**
   * Manually trigger sync
   */
  async manualSync(): Promise<void> {
    if (!this.isOnline) {
      console.warn('[Network] Cannot sync while offline');
      return;
    }

    await this.triggerSync();
  }
}

// Export singleton instance
export const networkStatusService = new NetworkStatusService();

/**
 * Hook for React components to monitor network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(networkStatusService.getIsOnline());

  React.useEffect(() => {
    const unsubscribe = networkStatusService.addListener((online) => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
