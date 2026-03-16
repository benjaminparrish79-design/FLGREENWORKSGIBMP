/**
 * FL-GreenGuard: Nitrogen Calculator Tests
 *
 * Covers the FDACS-compliant nitrogen math — the most safety-critical
 * logic in the entire app. Every compliance boundary is tested.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNitrogenApplication,
  getMaxCompliantApplication,
  validateFertilizerBag,
  type FertilizerBag,
  type ApplicationJob,
} from '../nitrogen-calculator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const quickBag: FertilizerBag = {
  nitrogenPercent: 10,
  phosphorusPercent: 10,
  potassiumPercent: 10,
  bagWeightLbs: 50,
  releaseType: 'quick-release',
};

const slowBag: FertilizerBag = {
  nitrogenPercent: 15,
  phosphorusPercent: 0,
  potassiumPercent: 15,
  bagWeightLbs: 50,
  releaseType: 'slow-release',
};

const zeroBag: FertilizerBag = {
  nitrogenPercent: 0,
  phosphorusPercent: 0,
  potassiumPercent: 50,
  bagWeightLbs: 50,
  releaseType: 'quick-release',
};

// ── calculateNitrogenApplication ──────────────────────────────────────────────

describe('calculateNitrogenApplication', () => {
  describe('quick-release compliance', () => {
    it('returns compliant for application at exactly the 0.5 lb/1000 sqft limit', () => {
      // 5 lbs N per bag, 10,000 sq ft → 0.5 lbs N / 1000 sq ft exactly
      const job: ApplicationJob = { turfAreaSqFt: 10_000, fertilizer: quickBag, bagsToApply: 1 };
      const result = calculateNitrogenApplication(job);
      expect(result.isCompliant).toBe(true);
      expect(result.applicationRatePer1000SqFt).toBeCloseTo(0.5, 4);
    });

    it('returns non-compliant when quick-release rate exceeds 0.5 lb/1000 sqft', () => {
      // 5 lbs N per bag on 5,000 sq ft → 1.0 lbs N / 1000 sq ft — too high
      const job: ApplicationJob = { turfAreaSqFt: 5_000, fertilizer: quickBag, bagsToApply: 1 };
      const result = calculateNitrogenApplication(job);
      expect(result.isCompliant).toBe(false);
      expect(result.applicationRatePer1000SqFt).toBeCloseTo(1.0, 4);
    });

    it('includes a warningMessage with corrected bag count when non-compliant', () => {
      const job: ApplicationJob = { turfAreaSqFt: 5_000, fertilizer: quickBag, bagsToApply: 1 };
      const result = calculateNitrogenApplication(job);
      expect(result.warningMessage).toBeDefined();
      expect(result.warningMessage).toContain('0');
    });
  });

  describe('slow-release compliance', () => {
    it('allows up to 1.5 lb/1000 sqft for slow-release', () => {
      // 7.5 lbs N per bag, 5,000 sq ft → 1.5 lbs N / 1000 sq ft — at limit
      const job: ApplicationJob = { turfAreaSqFt: 5_000, fertilizer: slowBag, bagsToApply: 1 };
      const result = calculateNitrogenApplication(job);
      expect(result.isCompliant).toBe(true);
      expect(result.applicationRatePer1000SqFt).toBeCloseTo(1.5, 4);
    });

    it('is non-compliant when slow-release rate exceeds 1.5 lb/1000 sqft', () => {
      const job: ApplicationJob = { turfAreaSqFt: 2_500, fertilizer: slowBag, bagsToApply: 1 };
      const result = calculateNitrogenApplication(job);
      expect(result.isCompliant).toBe(false);
    });
  });

  describe('calculation accuracy', () => {
    it('correctly calculates poundsNPerBag', () => {
      // 10% of 50 lbs = 5 lbs N
      const job: ApplicationJob = { turfAreaSqFt: 10_000, fertilizer: quickBag, bagsToApply: 1 };
      const result = calculateNitrogenApplication(job);
      expect(result.poundsNPerBag).toBeCloseTo(5.0, 4);
    });

    it('correctly calculates totalPoundsN for multiple bags', () => {
      const job: ApplicationJob = { turfAreaSqFt: 50_000, fertilizer: quickBag, bagsToApply: 3 };
      const result = calculateNitrogenApplication(job);
      expect(result.totalPoundsN).toBeCloseTo(15.0, 4);
    });

    it('handles fractional bags correctly', () => {
      const job: ApplicationJob = {
        turfAreaSqFt: 10_000,
        fertilizer: quickBag,
        bagsToApply: 0.5,
      };
      const result = calculateNitrogenApplication(job);
      expect(result.totalPoundsN).toBeCloseTo(2.5, 4);
    });

    it('handles zero bags (no application)', () => {
      const job: ApplicationJob = { turfAreaSqFt: 10_000, fertilizer: quickBag, bagsToApply: 0 };
      const result = calculateNitrogenApplication(job);
      expect(result.totalPoundsN).toBe(0);
      expect(result.isCompliant).toBe(true);
    });
  });

  describe('input validation', () => {
    it('throws when turf area is zero', () => {
      const job: ApplicationJob = { turfAreaSqFt: 0, fertilizer: quickBag, bagsToApply: 1 };
      expect(() => calculateNitrogenApplication(job)).toThrow();
    });

    it('throws when turf area is negative', () => {
      const job: ApplicationJob = { turfAreaSqFt: -500, fertilizer: quickBag, bagsToApply: 1 };
      expect(() => calculateNitrogenApplication(job)).toThrow();
    });

    it('throws when nitrogen percent is out of range', () => {
      const badBag: FertilizerBag = { ...quickBag, nitrogenPercent: 150 };
      const job: ApplicationJob = { turfAreaSqFt: 10_000, fertilizer: badBag, bagsToApply: 1 };
      expect(() => calculateNitrogenApplication(job)).toThrow();
    });

    it('throws when bags is negative', () => {
      const job: ApplicationJob = { turfAreaSqFt: 10_000, fertilizer: quickBag, bagsToApply: -1 };
      expect(() => calculateNitrogenApplication(job)).toThrow();
    });
  });

  describe('sample bag validation (10-10-10, 15-0-15)', () => {
    it('10-10-10 50 lb bag on 10,000 sqft — 1 bag should be compliant (quick)', () => {
      const job: ApplicationJob = { turfAreaSqFt: 10_000, fertilizer: quickBag, bagsToApply: 1 };
      expect(calculateNitrogenApplication(job).isCompliant).toBe(true);
    });

    it('15-0-15 50 lb bag on 5,000 sqft — 1 bag slow-release is compliant', () => {
      const job: ApplicationJob = { turfAreaSqFt: 5_000, fertilizer: slowBag, bagsToApply: 1 };
      expect(calculateNitrogenApplication(job).isCompliant).toBe(true);
    });
  });
});

// ── getMaxCompliantApplication ────────────────────────────────────────────────

describe('getMaxCompliantApplication', () => {
  it('returns the correct max bags for quick-release', () => {
    // Limit: 0.5 lbs N / 1000 sqft × 10,000 sqft = 5 lbs N max
    // poundsNPerBag = 5 lbs → maxBags = floor(5/5) = 1
    const result = getMaxCompliantApplication(10_000, quickBag);
    expect(result.maxBags).toBe(1);
    expect(result.maxPoundsN).toBeCloseTo(5.0, 4);
    expect(result.maxRatePer1000SqFt).toBe(0.5);
  });

  it('returns the correct max bags for slow-release', () => {
    // Limit: 1.5 lbs N / 1000 sqft × 5,000 sqft = 7.5 lbs N max
    // poundsNPerBag = 7.5 lbs → maxBags = floor(7.5/7.5) = 1
    const result = getMaxCompliantApplication(5_000, slowBag);
    expect(result.maxBags).toBe(1);
    expect(result.maxRatePer1000SqFt).toBe(1.5);
  });

  it('returns 0 bags when fertilizer has 0% nitrogen (no division by zero)', () => {
    const result = getMaxCompliantApplication(10_000, zeroBag);
    expect(result.maxBags).toBe(0);
    expect(result.maxPoundsN).toBe(0);
    expect(Number.isFinite(result.maxBags)).toBe(true);
    expect(Number.isNaN(result.maxBags)).toBe(false);
  });

  it('scales correctly with larger areas', () => {
    // 50,000 sqft quick-release: max = 0.5 × 50 = 25 lbs N → floor(25/5) = 5 bags
    const result = getMaxCompliantApplication(50_000, quickBag);
    expect(result.maxBags).toBe(5);
  });
});

// ── validateFertilizerBag ─────────────────────────────────────────────────────

describe('validateFertilizerBag', () => {
  it('validates a correct fertilizer bag as valid', () => {
    const result = validateFertilizerBag(quickBag);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects negative nitrogen percent', () => {
    const result = validateFertilizerBag({ ...quickBag, nitrogenPercent: -1 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Nitrogen'))).toBe(true);
  });

  it('rejects nitrogen percent over 100', () => {
    const result = validateFertilizerBag({ ...quickBag, nitrogenPercent: 101 });
    expect(result.isValid).toBe(false);
  });

  it('rejects zero bag weight', () => {
    const result = validateFertilizerBag({ ...quickBag, bagWeightLbs: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('weight'))).toBe(true);
  });

  it('rejects invalid release type', () => {
    const result = validateFertilizerBag({
      ...quickBag,
      releaseType: 'turbo-release' as any,
    });
    expect(result.isValid).toBe(false);
  });

  it('collects multiple errors at once', () => {
    const result = validateFertilizerBag({
      ...quickBag,
      nitrogenPercent: -5,
      bagWeightLbs: -10,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('allows 0% nitrogen (potassium-only product)', () => {
    const result = validateFertilizerBag(zeroBag);
    expect(result.isValid).toBe(true);
  });
});
