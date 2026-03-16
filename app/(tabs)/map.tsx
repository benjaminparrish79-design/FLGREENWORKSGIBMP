/**
 * FL-GreenGuard: Ring of Responsibility Map Screen
 *
 * Shows the user's current GPS location, nearby water bodies, and
 * the 10 ft buffer zones that must not be crossed during fertilizer application.
 */

import { Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';
import {
  requestLocationPermission,
  checkLocationPermission,
  watchLocation,
  getBufferZoneStatus,
  getSampleWaterBodies,
  metersToFeet,
  type LocationData,
  type BufferZoneStatus,
  type WaterBody,
} from '@/lib/location-service';

export default function MapScreen() {
  const colors = useColors();

  const [location, setLocation] = useState<LocationData | null>(null);
  const [bufferStatus, setBufferStatus] = useState<BufferZoneStatus | null>(null);
  const [waterBodies] = useState<WaterBody[]>(getSampleWaterBodies());
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const stopWatchRef = useRef<(() => void) | null>(null);

  // Check permissions on mount
  useEffect(() => {
    checkLocationPermission().then((granted) => {
      setPermissionGranted(granted);
      setLoading(false);
    });
    return () => {
      stopWatchRef.current?.();
    };
  }, []);

  // Evaluate buffer zone whenever location changes
  useEffect(() => {
    if (!location) return;
    const status = getBufferZoneStatus(
      { latitude: location.latitude, longitude: location.longitude },
      waterBodies
    );
    setBufferStatus(status);

    // Haptic alert when inside buffer zone
    if (status.isInBuffer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [location, waterBodies]);

  const startTracking = useCallback(async () => {
    const granted = await requestLocationPermission();
    setPermissionGranted(granted);
    if (!granted) return;

    setTracking(true);
    const stop = await watchLocation(
      (loc) => setLocation(loc),
      (err) => console.error('[Map] Location error:', err)
    );
    stopWatchRef.current = stop;
  }, []);

  const stopTracking = useCallback(() => {
    stopWatchRef.current?.();
    stopWatchRef.current = null;
    setTracking(false);
  }, []);

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  const distanceFt = bufferStatus
    ? metersToFeet(bufferStatus.distanceToWaterMeters)
    : null;

  const bufferColor =
    bufferStatus?.isInBuffer
      ? colors.error
      : distanceFt !== null && distanceFt < 30
      ? colors.warning
      : colors.success;

  return (
    <ScreenContainer className="p-4">
      <View className="gap-6 flex-1">
        {/* Header */}
        <View className="gap-1">
          <Text className="text-3xl font-bold text-foreground">Ring of Responsibility</Text>
          <Text className="text-sm text-muted">GPS Buffer Zone Monitor</Text>
        </View>

        {/* GPS Status Card */}
        <View
          className="rounded-lg p-4 border-2"
          style={{
            borderColor: bufferColor,
            backgroundColor: bufferColor + '15',
          }}
        >
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: bufferColor }} />
            <Text className="text-lg font-bold text-foreground">
              {bufferStatus?.isInBuffer
                ? '⚠ IN BUFFER ZONE'
                : tracking
                ? '✓ GPS Active'
                : '○ GPS Inactive'}
            </Text>
          </View>

          {location && (
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted">Latitude</Text>
                <Text className="text-xs font-mono text-foreground">
                  {location.latitude.toFixed(6)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted">Longitude</Text>
                <Text className="text-xs font-mono text-foreground">
                  {location.longitude.toFixed(6)}
                </Text>
              </View>
              {location.accuracy !== null && (
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted">Accuracy</Text>
                  <Text className="text-xs text-foreground">
                    ±{location.accuracy?.toFixed(1)} m
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Water Body Distance */}
        {bufferStatus && distanceFt !== null && (
          <View className="bg-surface rounded-lg p-4 gap-3">
            <Text className="text-sm font-semibold text-foreground">Nearest Water Body</Text>

            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-muted">
                {bufferStatus.nearestWaterBody?.name ?? 'Unknown'}
              </Text>
              <Text
                className="text-lg font-bold"
                style={{ color: bufferColor }}
              >
                {distanceFt.toFixed(0)} ft
              </Text>
            </View>

            {/* Distance bar */}
            <View className="h-3 bg-border rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (distanceFt / 100) * 100)}%`,
                  backgroundColor: bufferColor,
                }}
              />
            </View>
            <Text className="text-xs text-muted">
              {bufferStatus.isInBuffer
                ? '⚠ Stop! You are inside the 10 ft buffer zone.'
                : `Safe zone — min 10 ft required, you have ${distanceFt.toFixed(0)} ft clearance.`}
            </Text>
          </View>
        )}

        {/* Nearby Water Bodies List */}
        <View className="bg-surface rounded-lg p-4 gap-3">
          <Text className="text-sm font-semibold text-foreground">Monitored Water Bodies</Text>
          {waterBodies.map((wb) => (
            <View key={wb.id} className="flex-row justify-between items-center py-1 border-b border-border last:border-0">
              <View>
                <Text className="text-sm text-foreground">{wb.name}</Text>
                <Text className="text-xs text-muted capitalize">{wb.type}</Text>
              </View>
              <Text className="text-xs text-muted">
                {(wb.radiusMeters / 1000).toFixed(1)} km radius
              </Text>
            </View>
          ))}
          <Text className="text-xs text-muted pt-1">
            ⓘ Water body data is sourced from FDEP GIS. Production builds use live data.
          </Text>
        </View>

        {/* Permission Warning */}
        {permissionGranted === false && (
          <View className="bg-warning/10 border border-warning rounded-lg p-4">
            <Text className="text-sm font-semibold text-warning mb-1">
              Location Permission Required
            </Text>
            <Text className="text-xs text-warning/80">
              Enable location access in your device Settings to use GPS monitoring.
            </Text>
          </View>
        )}

        {/* Start / Stop Tracking */}
        <TouchableOpacity
          onPress={tracking ? stopTracking : startTracking}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: tracking ? colors.error : colors.primary,
            alignItems: 'center',
          }}
        >
          <Text className="text-lg font-bold text-background">
            {tracking ? '■ Stop GPS Tracking' : '▶ Start GPS Tracking'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
