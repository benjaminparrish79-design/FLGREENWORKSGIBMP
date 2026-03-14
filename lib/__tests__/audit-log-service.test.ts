/**
 * FL-GreenGuard: Audit Log Service Tests
 * 
 * Comprehensive test suite for offline-first sync functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createAuditLog,
  getLocalAuditLogs,
  getAuditLogById,
  updateAuditLog,
  deleteAuditLog,
  getPendingSyncIds,
  syncPendingLogs,
  getSyncStatus,
  getComplianceSummary,
  exportAuditLogsAsJson,
  clearSyncErrors,
  getSyncErrorHistory,
  type LocalAuditLog,
} from '../audit-log-service';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage');

// Mock Supabase
vi.mock('../supabase-client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      })),
    })),
  },
  validateAuditLogRecord: vi.fn(() => true),
}));

describe('Audit Log Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should create a new audit log with required fields', async () => {
      const logData = {
        userId: 1,
        propertyId: 1,
        timestamp: new Date().toISOString(),
        latitude: '28.2949',
        longitude: '-81.7603',
        nitrogenAppliedLbs: 2.5,
        isCompliant: true,
      };

      const result = await createAuditLog(logData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
      expect(result.synced).toBe(false);
      expect(result.userId).toBe(1);
      expect(result.propertyId).toBe(1);
      expect(result.nitrogenAppliedLbs).toBe(2.5);
      expect(result.isCompliant).toBe(true);
    });

    it('should throw error if required fields are missing', async () => {
      const invalidLog = {
        timestamp: new Date().toISOString(),
        latitude: '28.2949',
        longitude: '-81.7603',
        nitrogenAppliedLbs: 2.5,
        isCompliant: true,
      };

      await expect(createAuditLog(invalidLog as any)).rejects.toThrow(
        'Missing required fields'
      );
    });

    it('should save log to local storage', async () => {
      const logData = {
        userId: 1,
        propertyId: 1,
        timestamp: new Date().toISOString(),
        latitude: '28.2949',
        longitude: '-81.7603',
        nitrogenAppliedLbs: 2.5,
        isCompliant: true,
      };

      await createAuditLog(logData);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should add log ID to pending sync queue', async () => {
      const logData = {
        userId: 1,
        propertyId: 1,
        timestamp: new Date().toISOString(),
        latitude: '28.2949',
        longitude: '-81.7603',
        nitrogenAppliedLbs: 2.5,
        isCompliant: true,
      };

      await createAuditLog(logData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('pending_sync'),
        expect.any(String)
      );
    });
  });

  describe('getLocalAuditLogs', () => {
    it('should return empty array if no logs exist', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      const logs = await getLocalAuditLogs();

      expect(logs).toEqual([]);
    });

    it('should return parsed logs from storage', async () => {
      const mockLogs: LocalAuditLog[] = [
        {
          id: 1,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: true,
          createdAt: new Date().toISOString(),
          synced: false,
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockLogs));

      const logs = await getLocalAuditLogs();

      expect(logs).toEqual(mockLogs);
      expect(logs).toHaveLength(1);
    });

    it('should return empty array on parse error', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue('invalid json');

      const logs = await getLocalAuditLogs();

      expect(logs).toEqual([]);
    });
  });

  describe('getAuditLogById', () => {
    it('should return null if log not found', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));

      const log = await getAuditLogById(999);

      expect(log).toBeNull();
    });

    it('should return log if found', async () => {
      const mockLog: LocalAuditLog = {
        id: 1,
        userId: 1,
        propertyId: 1,
        timestamp: new Date().toISOString(),
        latitude: '28.2949',
        longitude: '-81.7603',
        nitrogenAppliedLbs: 2.5,
        isCompliant: true,
        createdAt: new Date().toISOString(),
        synced: false,
      };

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([mockLog]));

      const log = await getAuditLogById(1);

      expect(log).toEqual(mockLog);
    });
  });

  describe('updateAuditLog', () => {
    it('should update log with new values', async () => {
      const mockLog: LocalAuditLog = {
        id: 1,
        userId: 1,
        propertyId: 1,
        timestamp: new Date().toISOString(),
        latitude: '28.2949',
        longitude: '-81.7603',
        nitrogenAppliedLbs: 2.5,
        isCompliant: true,
        createdAt: new Date().toISOString(),
        synced: false,
      };

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([mockLog]));

      const updated = await updateAuditLog(1, { synced: true });

      expect(updated?.synced).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return null if log not found', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));

      const updated = await updateAuditLog(999, { synced: true });

      expect(updated).toBeNull();
    });
  });

  describe('deleteAuditLog', () => {
    it('should delete log from storage', async () => {
      const mockLog: LocalAuditLog = {
        id: 1,
        userId: 1,
        propertyId: 1,
        timestamp: new Date().toISOString(),
        latitude: '28.2949',
        longitude: '-81.7603',
        nitrogenAppliedLbs: 2.5,
        isCompliant: true,
        createdAt: new Date().toISOString(),
        synced: false,
      };

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([mockLog]));

      const result = await deleteAuditLog(1);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should return true even if log not found', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));

      const result = await deleteAuditLog(999);

      expect(result).toBe(true);
    });
  });

  describe('getPendingSyncIds', () => {
    it('should return empty array if no pending syncs', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      const ids = await getPendingSyncIds();

      expect(ids).toEqual([]);
    });

    it('should return pending sync IDs', async () => {
      const mockIds = [1, 2, 3];
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockIds));

      const ids = await getPendingSyncIds();

      expect(ids).toEqual(mockIds);
    });
  });

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      const mockLogs: LocalAuditLog[] = [
        {
          id: 1,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: true,
          createdAt: new Date().toISOString(),
          synced: true,
        },
        {
          id: 2,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: true,
          createdAt: new Date().toISOString(),
          synced: false,
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockLogs));

      const status = await getSyncStatus();

      expect(status.pendingCount).toBe(1);
      expect(status.syncedCount).toBe(1);
      expect(status.isOnline).toBe(true);
    });
  });

  describe('getComplianceSummary', () => {
    it('should calculate compliance summary', async () => {
      const mockLogs: LocalAuditLog[] = [
        {
          id: 1,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: true,
          createdAt: new Date().toISOString(),
          synced: true,
        },
        {
          id: 2,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: false,
          createdAt: new Date().toISOString(),
          synced: true,
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockLogs));

      const summary = await getComplianceSummary();

      expect(summary.totalApplications).toBe(2);
      expect(summary.compliantApplications).toBe(1);
      expect(summary.nonCompliantApplications).toBe(1);
      expect(summary.complianceRate).toBe(50);
    });

    it('should return zeros for empty logs', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));

      const summary = await getComplianceSummary();

      expect(summary.totalApplications).toBe(0);
      expect(summary.compliantApplications).toBe(0);
      expect(summary.nonCompliantApplications).toBe(0);
      expect(summary.complianceRate).toBe(0);
    });
  });

  describe('exportAuditLogsAsJson', () => {
    it('should export logs as JSON string', async () => {
      const mockLogs: LocalAuditLog[] = [
        {
          id: 1,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: true,
          createdAt: new Date().toISOString(),
          synced: true,
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockLogs));

      const json = await exportAuditLogsAsJson();

      expect(json).toContain('"id":1');
      expect(json).toContain('"userId":1');
      expect(JSON.parse(json)).toEqual(mockLogs);
    });
  });

  describe('clearSyncErrors', () => {
    it('should clear sync errors from logs', async () => {
      const mockLogs: LocalAuditLog[] = [
        {
          id: 1,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: true,
          createdAt: new Date().toISOString(),
          synced: false,
          lastSyncError: 'Network error',
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockLogs));

      await clearSyncErrors();

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getSyncErrorHistory', () => {
    it('should return sync error history', async () => {
      const mockLogs: LocalAuditLog[] = [
        {
          id: 1,
          userId: 1,
          propertyId: 1,
          timestamp: new Date().toISOString(),
          latitude: '28.2949',
          longitude: '-81.7603',
          nitrogenAppliedLbs: 2.5,
          isCompliant: true,
          createdAt: new Date().toISOString(),
          synced: false,
          lastSyncError: 'Network error',
          lastSyncAttempt: new Date().toISOString(),
          syncAttempts: 1,
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockLogs));

      const errors = await getSyncErrorHistory();

      expect(errors).toHaveLength(1);
      expect(errors[0].logId).toBe(1);
      expect(errors[0].error).toBe('Network error');
    });
  });
});
