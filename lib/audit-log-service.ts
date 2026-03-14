/**
 * FL-GreenGuard: Audit Log Service
 * 
 * Handles offline-first logging of fertilizer applications.
 * Logs are stored locally in AsyncStorage and synced to Supabase when online.
 * Fully aligned with Drizzle schema and includes comprehensive error handling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, type AuditLogRecord, validateAuditLogRecord } from './supabase-client';

const AUDIT_LOG_STORAGE_KEY = 'fl_greenguard_audit_logs';
const PENDING_SYNC_KEY = 'fl_greenguard_pending_sync';
const SYNC_STATUS_KEY = 'fl_greenguard_sync_status';

/**
 * Local audit log format - matches AuditLogRecord but with additional metadata
 */
export interface LocalAuditLog extends AuditLogRecord {
  synced?: boolean;
  syncAttempts?: number;
  lastSyncError?: string;
  lastSyncAttempt?: string;
}

/**
 * Sync error details for debugging
 */
export interface SyncError {
  logId: number;
  error: string;
  timestamp: string;
  attempt: number;
}

/**
 * Sync status information
 */
export interface SyncStatus {
  lastSyncTime?: string;
  lastSyncError?: string;
  isOnline: boolean;
  pendingCount: number;
  syncedCount: number;
}

/**
 * Create a new audit log entry
 */
export async function createAuditLog(
  log: Omit<LocalAuditLog, 'id' | 'createdAt' | 'synced' | 'syncAttempts'>
): Promise<LocalAuditLog> {
  try {
    // Validate required fields
    if (!log.userId || !log.propertyId || !log.timestamp) {
      throw new Error('Missing required fields: userId, propertyId, and timestamp are required');
    }

    // Generate ID (in a real app, this would be from the database)
    const id = Math.floor(Math.random() * 1000000);
    const createdAt = new Date().toISOString();

    const auditLog: LocalAuditLog = {
      ...log,
      id,
      createdAt,
      synced: false,
      syncAttempts: 0,
    };

    // Save to local storage
    await saveAuditLogLocally(auditLog);

    // Add to pending sync queue
    await addToPendingSync(id);

    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
}

/**
 * Save audit log to local storage (AsyncStorage)
 */
async function saveAuditLogLocally(log: LocalAuditLog): Promise<void> {
  try {
    const existingLogs = await getLocalAuditLogs();
    const updatedLogs = [...existingLogs, log];
    await AsyncStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updatedLogs));
  } catch (error) {
    console.error('Error saving audit log locally:', error);
    throw error;
  }
}

/**
 * Get all local audit logs
 */
export async function getLocalAuditLogs(): Promise<LocalAuditLog[]> {
  try {
    const data = await AsyncStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!data) return [];
    
    const logs = JSON.parse(data);
    if (!Array.isArray(logs)) {
      console.warn('Invalid audit logs format, returning empty array');
      return [];
    }
    
    return logs;
  } catch (error) {
    console.error('Error retrieving local audit logs:', error);
    return [];
  }
}

/**
 * Get a specific audit log by ID
 */
export async function getAuditLogById(id: number): Promise<LocalAuditLog | null> {
  try {
    const logs = await getLocalAuditLogs();
    return logs.find((log) => log.id === id) || null;
  } catch (error) {
    console.error('Error retrieving audit log:', error);
    return null;
  }
}

/**
 * Update an audit log
 */
export async function updateAuditLog(
  id: number,
  updates: Partial<LocalAuditLog>
): Promise<LocalAuditLog | null> {
  try {
    const logs = await getLocalAuditLogs();
    const index = logs.findIndex((log) => log.id === id);

    if (index === -1) {
      console.warn(`Audit log with ID ${id} not found`);
      return null;
    }

    const updatedLog = { ...logs[index], ...updates };
    logs[index] = updatedLog;

    await AsyncStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(logs));
    return updatedLog;
  } catch (error) {
    console.error('Error updating audit log:', error);
    return null;
  }
}

/**
 * Delete an audit log
 */
export async function deleteAuditLog(id: number): Promise<boolean> {
  try {
    const logs = await getLocalAuditLogs();
    const filteredLogs = logs.filter((log) => log.id !== id);
    await AsyncStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(filteredLogs));

    // Remove from pending sync
    await removeFromPendingSync(id);

    return true;
  } catch (error) {
    console.error('Error deleting audit log:', error);
    return false;
  }
}

/**
 * Add log ID to pending sync queue
 */
async function addToPendingSync(logId: number): Promise<void> {
  try {
    const pending = await getPendingSyncIds();
    if (!pending.includes(logId)) {
      pending.push(logId);
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    }
  } catch (error) {
    console.error('Error adding to pending sync:', error);
  }
}

/**
 * Remove log ID from pending sync queue
 */
async function removeFromPendingSync(logId: number): Promise<void> {
  try {
    const pending = await getPendingSyncIds();
    const filtered = pending.filter((id) => id !== logId);
    await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from pending sync:', error);
  }
}

/**
 * Get all pending sync log IDs
 */
export async function getPendingSyncIds(): Promise<number[]> {
  try {
    const data = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (!data) return [];
    
    const ids = JSON.parse(data);
    if (!Array.isArray(ids)) {
      console.warn('Invalid pending sync IDs format');
      return [];
    }
    
    return ids.filter((id) => typeof id === 'number');
  } catch (error) {
    console.error('Error retrieving pending sync IDs:', error);
    return [];
  }
}

/**
 * Sync pending logs to Supabase with retry logic and comprehensive error handling
 */
export async function syncPendingLogs(
  userId: number,
  maxRetries = 3
): Promise<{ synced: number; failed: number; errors: SyncError[] }> {
  const errors: SyncError[] = [];
  
  try {
    const pendingIds = await getPendingSyncIds();
    let synced = 0;
    let failed = 0;

    for (const logId of pendingIds) {
      const log = await getAuditLogById(logId);
      if (!log) {
        failed++;
        continue;
      }

      let lastError: any = null;
      let syncSuccess = false;

      // Retry logic with exponential backoff
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Validate data before sending
          if (!validateAuditLogRecord(log)) {
            console.warn(`Skipping invalid audit log ${logId}:`, log);
            
            errors.push({
              logId,
              error: 'Invalid audit log record format',
              timestamp: new Date().toISOString(),
              attempt: attempt + 1,
            });
            
            failed++;
            syncSuccess = true; // Mark as processed to avoid retry
            break;
          }

          // Update sync attempt count
          await updateAuditLog(logId, {
            syncAttempts: (log.syncAttempts || 0) + 1,
            lastSyncAttempt: new Date().toISOString(),
          });

          // Insert into Supabase applications table
          const { error, data } = await supabase
            .from('applications')
            .insert({
              id: log.id,
              propertyId: log.propertyId,
              userId: log.userId,
              nitrogenPercent: log.nitrogenAppliedLbs ? Math.round(log.nitrogenAppliedLbs) : undefined,
              gpsLat: log.latitude,
              gpsLong: log.longitude,
              weatherConditions: log.windSpeedMph || log.temperatureF 
                ? `Wind: ${log.windSpeedMph || 'N/A'} mph, Temp: ${log.temperatureF || 'N/A'}°F`
                : undefined,
              bufferZoneVerified: log.isCompliant ? 1 : 0,
              appliedAt: log.timestamp,
            })
            .select();

          if (error) {
            lastError = error;
            console.warn(`Attempt ${attempt + 1}/${maxRetries} failed for log ${logId}:`, error);
            
            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, attempt) * 1000)
              );
            }
          } else {
            // Mark as synced locally
            await updateAuditLog(logId, {
              synced: true,
              syncAttempts: (log.syncAttempts || 0) + 1,
              lastSyncAttempt: new Date().toISOString(),
            });
            
            await removeFromPendingSync(logId);
            synced++;
            syncSuccess = true;
            break;
          }
        } catch (error) {
          lastError = error;
          console.warn(`Attempt ${attempt + 1}/${maxRetries} error for log ${logId}:`, error);
          
          // Wait before retrying
          if (attempt < maxRetries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000)
            );
          }
        }
      }

      if (!syncSuccess) {
        console.error(`Failed to sync log ${logId} after ${maxRetries} attempts:`, lastError);
        
        errors.push({
          logId,
          error: lastError instanceof Error ? lastError.message : String(lastError),
          timestamp: new Date().toISOString(),
          attempt: maxRetries,
        });
        
        // Update with error information
        await updateAuditLog(logId, {
          lastSyncError: lastError instanceof Error ? lastError.message : String(lastError),
        });
        
        failed++;
      }
    }

    // Update sync status
    await updateSyncStatus({
      lastSyncTime: new Date().toISOString(),
      lastSyncError: errors.length > 0 ? errors[0]?.error : undefined,
      pendingCount: await getPendingSyncIds().then((ids) => ids.length),
      syncedCount: synced,
    });

    return { synced, failed, errors };
  } catch (error) {
    console.error('Error syncing pending logs:', error);
    const pending = await getPendingSyncIds();
    
    return {
      synced: 0,
      failed: pending.length,
      errors: [
        {
          logId: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          attempt: 1,
        },
      ],
    };
  }
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const logs = await getLocalAuditLogs();
    const pending = logs.filter((log) => !log.synced).length;
    const synced = logs.filter((log) => log.synced).length;
    
    const statusData = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    const status = statusData ? JSON.parse(statusData) : {};

    return {
      lastSyncTime: status.lastSyncTime,
      lastSyncError: status.lastSyncError,
      isOnline: true, // This would be determined by network status
      pendingCount: pending,
      syncedCount: synced,
    };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {
      isOnline: true,
      pendingCount: 0,
      syncedCount: 0,
    };
  }
}

/**
 * Update sync status
 */
async function updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
  try {
    const current = await getSyncStatus();
    const updated = { ...current, ...status };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating sync status:', error);
  }
}

/**
 * Export audit logs as JSON
 */
export async function exportAuditLogsAsJson(): Promise<string> {
  try {
    const logs = await getLocalAuditLogs();
    return JSON.stringify(logs, null, 2);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
}

/**
 * Get compliance summary
 */
export async function getComplianceSummary(): Promise<{
  totalApplications: number;
  compliantApplications: number;
  nonCompliantApplications: number;
  complianceRate: number;
}> {
  try {
    const logs = await getLocalAuditLogs();

    const totalApplications = logs.length;
    const compliantApplications = logs.filter((log) => log.isCompliant).length;
    const nonCompliantApplications = totalApplications - compliantApplications;
    const complianceRate =
      totalApplications > 0
        ? (compliantApplications / totalApplications) * 100
        : 0;

    return {
      totalApplications,
      compliantApplications,
      nonCompliantApplications,
      complianceRate,
    };
  } catch (error) {
    console.error('Error calculating compliance summary:', error);
    return {
      totalApplications: 0,
      compliantApplications: 0,
      nonCompliantApplications: 0,
      complianceRate: 0,
    };
  }
}

/**
 * Clear all sync errors
 */
export async function clearSyncErrors(): Promise<void> {
  try {
    const logs = await getLocalAuditLogs();
    const clearedLogs = logs.map((log) => ({
      ...log,
      lastSyncError: undefined,
    }));
    await AsyncStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(clearedLogs));
  } catch (error) {
    console.error('Error clearing sync errors:', error);
  }
}

/**
 * Get sync error history
 */
export async function getSyncErrorHistory(): Promise<SyncError[]> {
  try {
    const logs = await getLocalAuditLogs();
    return logs
      .filter((log) => log.lastSyncError)
      .map((log) => ({
        logId: log.id,
        error: log.lastSyncError || 'Unknown error',
        timestamp: log.lastSyncAttempt || log.createdAt,
        attempt: log.syncAttempts || 0,
      }));
  } catch (error) {
    console.error('Error getting sync error history:', error);
    return [];
  }
}
