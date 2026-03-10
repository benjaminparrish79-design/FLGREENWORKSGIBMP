import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import {
  getCurrentLocation,
  watchLocation,
  getBufferZoneStatus,
  getSampleWaterBodies,
  metersToFeet,
  type LocationData,
} from '@/lib/location-service';
import * as Haptics from 'expo-haptics';

export default function MapScreen() {
  const colors = useColors();

  const [location, setLocation] = useState<LocationData | null>(null);
  const [bufferStatus, setBufferStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const waterBodies = getSampleWaterBodies();

  const startTracking = useCallback(async () => {
    try {
      setTracking(true);
      const unsub = await watchLocation(
        (newLocation) => {
          setLocation(newLocation);
          const status = getBufferZoneStatus(
            { latitude: newLocation.latitude, longitude: newLocation.longitude },
            waterBodies
          );
          setBufferStatus(status);

          // Haptic alert if in buffer zone
          if (status.isInBuffer) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        },
        (error) => {
          Alert.alert('Location Error', error.message);
          setTracking(false);
        }
      );

      if (unsub) {
        unsubscribeRef.current = unsub;
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start location tracking');
      setTracking(false);
    }
  }, [waterBodies]);

  const stopTracking = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setTracking(false);
  }, []);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const loc = await getCurrentLocation();
        if (loc) {
          setLocation(loc);
          const status = getBufferZoneStatus(
            { latitude: loc.latitude, longitude: loc.longitude },
            waterBodies
          );
          setBufferStatus(status);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to get location');
      } finally {
        setLoading(false);
      }
    };

    initLocation();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [waterBodies]);

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-lg text-muted mt-4">Getting your location...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <View className="flex-1 gap-4">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Ring of Responsibility</Text>
          <Text className="text-sm text-muted">GPS Buffer Zone Monitor</Text>
        </View>

        {/* Map Placeholder */}
        <View className="bg-surface rounded-lg p-6 items-center justify-center h-64 border-2 border-border">
          {location ? (
            <View className="items-center gap-2">
              <Text className="text-sm text-muted">📍 Current Location</Text>
              <Text className="text-lg font-mono text-foreground">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
              <Text className="text-xs text-muted mt-2">
                Accuracy: {location.accuracy ? `±${location.accuracy.toFixed(0)}m` : 'Unknown'}
              </Text>
            </View>
          ) : (
            <Text className="text-muted">Location unavailable</Text>
          )}
        </View>

        {/* Buffer Zone Status */}
        {bufferStatus && (
          <View
            className={`rounded-lg p-4 border-2 ${
              bufferStatus.isInBuffer
                ? 'bg-error/10 border-error'
                : 'bg-success/10 border-success'
            }`}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <View
                className={`w-4 h-4 rounded-full ${
                  bufferStatus.isInBuffer ? 'bg-error' : 'bg-success'
                }`}
              />
              <Text
                className={`text-lg font-bold ${
                  bufferStatus.isInBuffer ? 'text-error' : 'text-success'
                }`}
              >
                {bufferStatus.isInBuffer ? '⚠ IN BUFFER ZONE' : '✓ SAFE DISTANCE'}
              </Text>
            </View>

            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Distance to Water:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {metersToFeet(bufferStatus.distanceToWaterMeters).toFixed(0)} ft
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted">Buffer Zone:</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {metersToFeet(bufferStatus.bufferRadiusMeters).toFixed(0)} ft
                </Text>
              </View>
              {bufferStatus.nearestWaterBody && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted">Nearest Water Body:</Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {bufferStatus.nearestWaterBody.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Tracking Controls */}
        <View className="gap-2">
          {!tracking ? (
            <TouchableOpacity
              onPress={startTracking}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: 'center',
              }}
            >
              <Text className="text-lg font-bold text-background">🚀 Start Application</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={stopTracking}
              style={{
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: colors.error,
                alignItems: 'center',
              }}
            >
              <Text className="text-lg font-bold text-background">⏹ Stop Application</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Box */}
        <View className="bg-primary/10 rounded-lg p-4 border border-primary">
          <Text className="text-sm font-semibold text-primary mb-2">💡 How It Works</Text>
          <Text className="text-xs text-primary/80">
            The app monitors your GPS location in real-time. If you drift within 10 feet of a water body, you'll
            receive a haptic alert. Keep your distance to stay compliant.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}
