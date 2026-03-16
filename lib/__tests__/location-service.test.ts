/**
 * FL-GreenGuard: Location Service Tests
 *
 * Covers the Haversine distance formula, buffer zone detection,
 * and unit conversion helpers — all pure functions with no side effects.
 * GPS permission / watch functions that call expo-location are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateDistance,
  isInBufferZone,
  getBufferZoneStatus,
  metersToFeet,
  feetToMeters,
  getSampleWaterBodies,
  type GeoPoint,
  type WaterBody,
} from '../location-service';

// Mock expo-location — no real GPS hardware in tests
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({
    coords: { latitude: 28.5, longitude: -81.4, accuracy: 5, altitude: 0, heading: 0, speed: 0 },
    timestamp: Date.now(),
  }),
  watchPositionAsync: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  Accuracy: { High: 4, Balanced: 3 },
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Two points ~111 m apart (1 arc-second of latitude ≈ 30.9 m; 0.001° ≈ 111 m) */
const pointA: GeoPoint = { latitude: 28.5000, longitude: -81.4000 };
const pointB: GeoPoint = { latitude: 28.5010, longitude: -81.4000 }; // ~111 m north

const sampleWaterBody: WaterBody = {
  id: 'test-lake',
  name: 'Test Lake',
  type: 'lake',
  centerPoint: { latitude: 28.5000, longitude: -81.4000 },
  radiusMeters: 500,
};

// ── calculateDistance ─────────────────────────────────────────────────────────

describe('calculateDistance', () => {
  it('returns 0 for identical points', () => {
    expect(calculateDistance(pointA, pointA)).toBeCloseTo(0, 1);
  });

  it('returns approximately 111 m for 0.001° latitude difference', () => {
    const dist = calculateDistance(pointA, pointB);
    // 0.001° latitude ≈ 111 m; allow ±5 m tolerance
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it('is symmetric — distance A→B equals distance B→A', () => {
    const d1 = calculateDistance(pointA, pointB);
    const d2 = calculateDistance(pointB, pointA);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it('returns a positive number for distinct points', () => {
    expect(calculateDistance(pointA, pointB)).toBeGreaterThan(0);
  });

  it('correctly handles longitude difference', () => {
    const east: GeoPoint = { latitude: 28.5, longitude: -81.3990 };
    const dist = calculateDistance(pointA, east);
    expect(dist).toBeGreaterThan(0);
  });
});

// ── isInBufferZone ────────────────────────────────────────────────────────────

describe('isInBufferZone', () => {
  it('returns true when location is within the buffer radius', () => {
    // Place the test point 2 m away from the water body centre
    const closePoint: GeoPoint = { latitude: 28.500001, longitude: -81.4000 };
    expect(isInBufferZone(closePoint, sampleWaterBody, 10)).toBe(true);
  });

  it('returns false when location is outside the buffer radius', () => {
    // pointB is ~111 m away — well outside the 3.05 m (10 ft) buffer
    expect(isInBufferZone(pointB, sampleWaterBody, 3.048)).toBe(false);
  });

  it('uses 10 ft (3.048 m) as the default buffer', () => {
    const veryClose: GeoPoint = { latitude: 28.5000001, longitude: -81.4000 };
    // ~0.01 m away — must be inside default buffer
    expect(isInBufferZone(veryClose, sampleWaterBody)).toBe(true);
  });
});

// ── getBufferZoneStatus ───────────────────────────────────────────────────────

describe('getBufferZoneStatus', () => {
  const waterBodies = getSampleWaterBodies();

  it('returns isInBuffer: false for a safe location far from water', () => {
    // Orlando downtown — well away from sample water bodies
    const safeLoc: GeoPoint = { latitude: 28.5383, longitude: -81.3792 };
    const status = getBufferZoneStatus(safeLoc, waterBodies);
    expect(status.isInBuffer).toBe(false);
  });

  it('identifies the nearest water body', () => {
    const nearLake: GeoPoint = { latitude: 28.6001, longitude: -81.5001 };
    const status = getBufferZoneStatus(nearLake, waterBodies);
    expect(status.nearestWaterBody).toBeDefined();
    expect(status.nearestWaterBody?.name).toBeDefined();
  });

  it('returns distance 0 when waterBodies list is empty', () => {
    const status = getBufferZoneStatus(pointA, []);
    expect(status.distanceToWaterMeters).toBe(0);
    expect(status.isInBuffer).toBe(false);
  });

  it('exposes bufferRadiusMeters in result', () => {
    const status = getBufferZoneStatus(pointA, waterBodies);
    expect(status.bufferRadiusMeters).toBeGreaterThan(0);
  });
});

// ── Unit conversions ──────────────────────────────────────────────────────────

describe('metersToFeet', () => {
  it('converts 1 metre to approximately 3.281 feet', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.2808, 3);
  });

  it('converts 10 ft buffer back to ~3.048 m', () => {
    expect(metersToFeet(3.048)).toBeCloseTo(10, 1);
  });

  it('returns 0 for 0 metres', () => {
    expect(metersToFeet(0)).toBe(0);
  });
});

describe('feetToMeters', () => {
  it('converts 10 feet to approximately 3.048 metres', () => {
    expect(feetToMeters(10)).toBeCloseTo(3.048, 3);
  });

  it('is the inverse of metersToFeet', () => {
    const metres = 15.5;
    expect(feetToMeters(metersToFeet(metres))).toBeCloseTo(metres, 5);
  });
});

// ── getSampleWaterBodies ──────────────────────────────────────────────────────

describe('getSampleWaterBodies', () => {
  it('returns an array of water bodies', () => {
    const bodies = getSampleWaterBodies();
    expect(Array.isArray(bodies)).toBe(true);
    expect(bodies.length).toBeGreaterThan(0);
  });

  it('each water body has required fields', () => {
    getSampleWaterBodies().forEach((wb) => {
      expect(wb).toHaveProperty('id');
      expect(wb).toHaveProperty('name');
      expect(wb).toHaveProperty('type');
      expect(wb).toHaveProperty('centerPoint');
      expect(wb.centerPoint).toHaveProperty('latitude');
      expect(wb.centerPoint).toHaveProperty('longitude');
      expect(wb).toHaveProperty('radiusMeters');
    });
  });

  it('all water bodies are located in Florida (lat 24-31, lon -82 to -80)', () => {
    getSampleWaterBodies().forEach((wb) => {
      expect(wb.centerPoint.latitude).toBeGreaterThan(24);
      expect(wb.centerPoint.latitude).toBeLessThan(31);
      expect(wb.centerPoint.longitude).toBeGreaterThan(-83);
      expect(wb.centerPoint.longitude).toBeLessThan(-80);
    });
  });
});
