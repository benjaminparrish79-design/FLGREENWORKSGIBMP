/**
 * FL-GreenGuard: Location Service
 * 
 * Handles GPS tracking, buffer zone calculations, and water body proximity detection.
 * Implements the "Ring of Responsibility" feature.
 */

import * as Location from 'expo-location';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationData extends GeoPoint {
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface WaterBody {
  id: string;
  name: string;
  type: 'stream' | 'lake' | 'wetland' | 'pond';
  centerPoint: GeoPoint;
  radiusMeters: number;
}

export interface BufferZoneStatus {
  isInBuffer: boolean;
  distanceToWaterMeters: number;
  nearestWaterBody?: WaterBody;
  bufferRadiusMeters: number;
}

/**
 * Buffer zone radius in feet (10 ft from water bodies)
 */
const BUFFER_ZONE_FEET = 10;
const BUFFER_ZONE_METERS = BUFFER_ZONE_FEET * 0.3048; // Convert feet to meters

/**
 * Request location permissions
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
}

/**
 * Check if location permission is granted
 */
export async function checkLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
}

/**
 * Get current location
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Watch location changes (for real-time tracking)
 */
export async function watchLocation(
  callback: (location: LocationData) => void,
  onError?: (error: Error) => void
): Promise<(() => void) | null> {
  try {
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000, // Update every 1 second
        distanceInterval: 10, // Or every 10 meters
      },
      (location: Location.LocationObject) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        });
      }
    );

    // Return unsubscribe function
    return () => subscription.remove();
  } catch (error) {
    console.error('Error watching location:', error);
    onError?.(error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Calculate distance between two points (in meters)
 * Uses Haversine formula
 */
export function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const deltaLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a location is within a buffer zone of a water body
 */
export function isInBufferZone(
  location: GeoPoint,
  waterBody: WaterBody,
  bufferRadiusMeters: number = BUFFER_ZONE_METERS
): boolean {
  const distance = calculateDistance(location, waterBody.centerPoint);
  return distance < bufferRadiusMeters;
}

/**
 * Get buffer zone status for a location
 */
export function getBufferZoneStatus(
  location: GeoPoint,
  waterBodies: WaterBody[]
): BufferZoneStatus {
  let minDistance = Infinity;
  let nearestWaterBody: WaterBody | undefined;

  for (const waterBody of waterBodies) {
    const distance = calculateDistance(location, waterBody.centerPoint);
    if (distance < minDistance) {
      minDistance = distance;
      nearestWaterBody = waterBody;
    }
  }

  return {
    isInBuffer: minDistance < BUFFER_ZONE_METERS,
    distanceToWaterMeters: minDistance === Infinity ? 0 : minDistance,
    nearestWaterBody,
    bufferRadiusMeters: BUFFER_ZONE_METERS,
  };
}

/**
 * Convert meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters / 0.3048;
}

/**
 * Convert feet to meters
 */
export function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

/**
 * Get sample water bodies for testing (Florida)
 * In production, this would come from a GIS API or database
 */
export function getSampleWaterBodies(): WaterBody[] {
  return [
    {
      id: 'lake-1',
      name: 'Lake Apopka',
      type: 'lake',
      centerPoint: { latitude: 28.6, longitude: -81.5 },
      radiusMeters: 5000,
    },
    {
      id: 'stream-1',
      name: 'Wekiwa Creek',
      type: 'stream',
      centerPoint: { latitude: 28.7, longitude: -81.4 },
      radiusMeters: 1000,
    },
    {
      id: 'wetland-1',
      name: 'Tosohatchee Reserve',
      type: 'wetland',
      centerPoint: { latitude: 28.5, longitude: -81.3 },
      radiusMeters: 3000,
    },
  ];
}
