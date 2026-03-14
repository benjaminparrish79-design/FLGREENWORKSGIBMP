import { ScrollView, Text, View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  getLocalAuditLogs,
  getComplianceSummary,
  getPendingSyncIds,
  type LocalAuditLog,
} from '@/lib/audit-log-service';
import * as Haptics from 'expo-haptics';

export default function AuditLogsScreen() {
  const colors = useColors();

  const [logs, setLogs] = useState<LocalAuditLog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [auditLogs, complianceSummary, pendingIds] = await Promise.all([
        getLocalAuditLogs(),
        getComplianceSummary(),
        getPendingSyncIds(),
      ]);

      setLogs(auditLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setSummary(complianceSummary);
      setPendingSyncCount(pendingIds.length);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDistance = (feet: number) => {
    return feet < 1000 ? `${feet.toFixed(0)} ft` : `${(feet / 1000).toFixed(1)} k ft`;
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-lg text-muted">Loading audit logs...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View className="gap-2 mb-6">
              <Text className="text-3xl font-bold text-foreground">Audit Logs</Text>
              <Text className="text-sm text-muted">Compliance history for inspections</Text>
            </View>

            {/* Compliance Summary Card */}
            {summary && (
              <View className="bg-surface rounded-lg p-4 mb-6 gap-3">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-lg font-semibold text-foreground">Compliance Summary</Text>
                  {pendingSyncCount > 0 && (
                    <View className="bg-warning/20 px-2 py-1 rounded">
                      <Text className="text-xs font-semibold text-warning">
                        {pendingSyncCount} pending sync
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <Text className="text-xs text-muted mb-1">Total Applications</Text>
                    <Text className="text-2xl font-bold text-foreground">
                      {summary.totalApplications}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-muted mb-1">Compliant</Text>
                    <Text className="text-2xl font-bold text-success">
                      {summary.compliantApplications}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-muted mb-1">Rate</Text>
                    <Text className="text-2xl font-bold text-primary">
                      {summary.complianceRate.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Logs List Header */}
            <Text className="text-sm font-semibold text-foreground mb-3">Recent Applications</Text>
          </>
        }
        renderItem={({ item }) => (
          <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
            {/* Date and Compliance Status */}
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1">
                <Text className="text-sm text-muted">{formatDate(item.createdAt)}</Text>
              </View>
              <View
                className={`px-2 py-1 rounded ${
                  item.isCompliant ? 'bg-success/20' : 'bg-error/20'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    item.isCompliant ? 'text-success' : 'text-error'
                  }`}
                >
                  {item.isCompliant ? '✓ Compliant' : '✗ Non-Compliant'}
                </Text>
              </View>
            </View>

            {/* Job Details */}
            <View className="gap-2 mb-3">
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted">Nitrogen Applied:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {item.nitrogenAppliedLbs.toFixed(2)} lbs
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted">Distance to Water:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {formatDistance(item.distanceToWaterFeet || 0)}
                </Text>
              </View>
            </View>

            {/* Location and Weather */}
            <View className="border-t border-border pt-2 gap-2">
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted">Location:</Text>
                <Text className="text-xs text-foreground font-mono">
                  {parseFloat(item.latitude || '0').toFixed(4)}, {parseFloat(item.longitude || '0').toFixed(4)}
                </Text>
              </View>
              {item.windSpeedMph !== null && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">Wind Speed:</Text>
                  <Text className="text-xs text-foreground">
                    {item.windSpeedMph.toFixed(1)} mph
                  </Text>
                </View>
              )}
              {item.temperatureF !== null && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">Temperature:</Text>
                  <Text className="text-xs text-foreground">{item.temperatureF.toFixed(0)}°F</Text>
                </View>
              )}
            </View>

            {/* Sync Status */}
            {item.synced === false && (
              <View className="mt-3 pt-3 border-t border-border">
                <Text className="text-xs text-warning font-semibold">⏳ Pending sync to cloud</Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Text className="text-lg text-muted">No audit logs yet</Text>
            <Text className="text-sm text-muted mt-2">Start a new job to create your first log</Text>
          </View>
        }
        scrollEnabled={false}
      />
    </ScreenContainer>
  );
}
