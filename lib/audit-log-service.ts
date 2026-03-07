/**
 * FL-GreenGuard: Audit Log Service
 * 
 * Handles offline-first logging of fertilizer applications.
 * Logs are stored locally in AsyncStorage and synced to Supabase when online.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, type AuditLogRecord } from './supabase-client';

const AUDIT_LOG_STORAGE_KEY = 'fl_greenguard_audit_logs';
const PENDING_SYNC_KEY = 'fl_greenguard_pending_sync';

export interface LocalAuditLog {
  id: string;
  job_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  gps_accuracy_meters: number | null;
  wind_speed_mph: number | null;
  temperature_f: number | null;
  nitrogen_applied_lbs: number;
  distance_to_water_feet: number;
  is_compliant: boolean;
  notes?: string;
  synced?: boolean;
  created_at: string;
}

/**
 * Create a new audit log entry
 */
export async function createAuditLog(log: Omit<LocalAuditLog, 'id' | 'created_at'>): Promise<LocalAuditLog> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const created_at = new Date().toISOString();

  const auditLog: LocalAuditLog = {
    ...log,
    id,
    created_at,
    synced: false,
  };

  // Save to local storage
  await saveAuditLogLocally(auditLog);

  // Add to pending sync queue
  await addToPendingSync(id);

  return auditLog;
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
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error retrieving local audit logs:', error);
    return [];
  }
}

/**
 * Get a specific audit log by ID
 */
export async function getAuditLogById(id: string): Promise<LocalAuditLog | null> {
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
export async function updateAuditLog(id: string, updates: Partial<LocalAuditLog>): Promise<LocalAuditLog | null> {
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
export async function deleteAuditLog(id: string): Promise<boolean> {
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
async function addToPendingSync(logId: string): Promise<void> {
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
async function removeFromPendingSync(logId: string): Promise<void> {
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
export async function getPendingSyncIds(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error retrieving pending sync IDs:', error);
    return [];
  }
}

/**
 * Sync pending logs to Supabase
 */
export async function syncPendingLogs(userId: string): Promise<{ synced: number; failed: number }> {
  try {
    const pendingIds = await getPendingSyncIds();
    let synced = 0;
    let failed = pendingIds.length;

    for (const logId of pendingIds) {
      const log = await getAuditLogById(logId);
      if (!log) continue;

      try {
        // Insert into Supabase
        const { error } = await supabase.from('audit_logs').insert({
          id: log.id,
          job_id: log.job_id,
          user_id: userId,
          timestamp: log.timestamp,
          latitude: log.latitude,
          longitude: log.longitude,
          gps_accuracy_meters: log.gps_accuracy_meters,
          wind_speed_mph: log.wind_speed_mph,
          temperature_f: log.temperature_f,
          nitrogen_applied_lbs: log.nitrogen_applied_lbs,
          distance_to_water_feet: log.distance_to_water_feet,
          is_compliant: log.is_compliant,
          notes: log.notes,
          created_at: log.created_at,
        });

        if (error) {
          console.error(`Error syncing log ${logId}:`, error);
          failed++;
        } else {
          // Mark as synced locally
          await updateAuditLog(logId, { synced: true });
          await removeFromPendingSync(logId);
          synced++;
        }
      } catch (error) {
        console.error(`Error syncing log ${logId}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('Error syncing pending logs:', error);
    const pending = await getPendingSyncIds();
    return { synced: 0, failed: pending.length };
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
    const compliantApplications = logs.filter((log) => log.is_compliant).length;
    const nonCompliantApplications = totalApplications - compliantApplications;
    const complianceRate = totalApplications > 0 ? (compliantApplications / totalApplications) * 100 : 0;

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
