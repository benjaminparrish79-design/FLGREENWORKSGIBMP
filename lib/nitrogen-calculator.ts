/**
 * FL-GreenGuard: Smart N-Calculator
 * 
 * FDACS-Compliant Nitrogen Application Calculator
 * 
 * Rules:
 * - Quick-release nitrogen: Max 0.5 lb per 1,000 sq ft
 * - Slow-release nitrogen: Additional allowance (product-dependent)
 * - Total nitrogen must not exceed state/local limits
 * 
 * Formula:
 * Pounds of N per bag = (Bag N% / 100) × Bag Weight (lbs)
 * Application rate = Pounds of N per bag / Turf area (sq ft) × 1,000
 */

export interface FertilizerBag {
  /** Nitrogen percentage (0-100) */
  nitrogenPercent: number;
  /** Phosphorus percentage (0-100) */
  phosphorusPercent: number;
  /** Potassium percentage (0-100) */
  potassiumPercent: number;
  /** Weight of bag in pounds */
  bagWeightLbs: number;
  /** Type: 'quick-release' or 'slow-release' */
  releaseType: 'quick-release' | 'slow-release';
}

export interface ApplicationJob {
  /** Turf area in square feet */
  turfAreaSqFt: number;
  /** Fertilizer bag details */
  fertilizer: FertilizerBag;
  /** Number of bags to apply */
  bagsToApply: number;
}

export interface CalculationResult {
  /** Pounds of nitrogen per bag */
  poundsNPerBag: number;
  /** Total pounds of nitrogen to apply */
  totalPoundsN: number;
  /** Application rate (lbs N per 1,000 sq ft) */
  applicationRatePer1000SqFt: number;
  /** Number of bags needed */
  bagsNeeded: number;
  /** Compliance status */
  isCompliant: boolean;
  /** Compliance message */
  complianceMessage: string;
  /** Warning message (if applicable) */
  warningMessage?: string;
}

/**
 * FDACS Compliance Limits
 */
const FDACS_LIMITS = {
  quickRelease: 0.5, // lbs N per 1,000 sq ft
  slowRelease: 1.0, // lbs N per 1,000 sq ft (additional allowance)
  maxTotal: 1.5, // lbs N per 1,000 sq ft (combined limit)
};

/**
 * Calculate nitrogen application for a given job
 * 
 * @param job - Application job details
 * @returns Calculation result with compliance status
 */
export function calculateNitrogenApplication(
  job: ApplicationJob
): CalculationResult {
  const { turfAreaSqFt, fertilizer, bagsToApply } = job;

  // Validate inputs
  if (turfAreaSqFt <= 0) {
    throw new Error('Turf area must be greater than 0 sq ft');
  }
  if (bagsToApply < 0) {
    throw new Error('Number of bags cannot be negative');
  }
  if (fertilizer.nitrogenPercent < 0 || fertilizer.nitrogenPercent > 100) {
    throw new Error('Nitrogen percentage must be between 0 and 100');
  }

  // Step 1: Calculate pounds of N per bag
  const poundsNPerBag = (fertilizer.nitrogenPercent / 100) * fertilizer.bagWeightLbs;

  // Step 2: Calculate total pounds of N to apply
  const totalPoundsN = poundsNPerBag * bagsToApply;

  // Step 3: Calculate application rate (per 1,000 sq ft)
  const applicationRatePer1000SqFt = (totalPoundsN / turfAreaSqFt) * 1000;

  // Step 4: Determine compliance based on release type
  let isCompliant = false;
  let complianceMessage = '';
  let warningMessage: string | undefined;

  if (fertilizer.releaseType === 'quick-release') {
    // Quick-release must not exceed 0.5 lbs N per 1,000 sq ft
    isCompliant = applicationRatePer1000SqFt <= FDACS_LIMITS.quickRelease;
    if (isCompliant) {
      complianceMessage = `✓ COMPLIANT: ${applicationRatePer1000SqFt.toFixed(2)} lbs N/1000 sq ft (Max: ${FDACS_LIMITS.quickRelease} lbs)`;
    } else {
      complianceMessage = `✗ NON-COMPLIANT: ${applicationRatePer1000SqFt.toFixed(2)} lbs N/1000 sq ft exceeds max of ${FDACS_LIMITS.quickRelease} lbs`;
      warningMessage = `Reduce bags to ${Math.floor((FDACS_LIMITS.quickRelease * turfAreaSqFt) / (1000 * poundsNPerBag))} or fewer`;
    }
  } else if (fertilizer.releaseType === 'slow-release') {
    // Slow-release has additional allowance, but total cannot exceed 1.5 lbs
    isCompliant = applicationRatePer1000SqFt <= FDACS_LIMITS.maxTotal;
    if (isCompliant) {
      complianceMessage = `✓ COMPLIANT: ${applicationRatePer1000SqFt.toFixed(2)} lbs N/1000 sq ft (Max: ${FDACS_LIMITS.maxTotal} lbs for slow-release)`;
    } else {
      complianceMessage = `✗ NON-COMPLIANT: ${applicationRatePer1000SqFt.toFixed(2)} lbs N/1000 sq ft exceeds max of ${FDACS_LIMITS.maxTotal} lbs`;
      warningMessage = `Reduce bags to ${Math.floor((FDACS_LIMITS.maxTotal * turfAreaSqFt) / (1000 * poundsNPerBag))} or fewer`;
    }
  }

  // Step 5: Calculate bags needed for compliant application
  let bagsNeeded = bagsToApply;
  if (!isCompliant && poundsNPerBag > 0) {
    const maxPoundsN = (fertilizer.releaseType === 'quick-release'
      ? FDACS_LIMITS.quickRelease
      : FDACS_LIMITS.maxTotal) * (turfAreaSqFt / 1000);
    bagsNeeded = Math.floor(maxPoundsN / poundsNPerBag);
  }

  return {
    poundsNPerBag,
    totalPoundsN,
    applicationRatePer1000SqFt,
    bagsNeeded,
    isCompliant,
    complianceMessage,
    warningMessage,
  };
}

/**
 * Get recommended application for a given turf area
 * 
 * @param turfAreaSqFt - Turf area in square feet
 * @param fertilizer - Fertilizer details
 * @returns Maximum compliant application rate
 */
export function getMaxCompliantApplication(
  turfAreaSqFt: number,
  fertilizer: FertilizerBag
): { maxBags: number; maxPoundsN: number; maxRatePer1000SqFt: number } {
  const poundsNPerBag = (fertilizer.nitrogenPercent / 100) * fertilizer.bagWeightLbs;

  // Guard: if fertilizer contains no nitrogen (e.g. a potassium-only product),
  // there is no meaningful limit — return 0 bags to prevent division by zero.
  if (poundsNPerBag <= 0) {
    return { maxBags: 0, maxPoundsN: 0, maxRatePer1000SqFt: 0 };
  }

  const limit = fertilizer.releaseType === 'quick-release'
    ? FDACS_LIMITS.quickRelease
    : FDACS_LIMITS.maxTotal;
  const maxPoundsN = (limit * turfAreaSqFt) / 1000;
  const maxBags = Math.floor(maxPoundsN / poundsNPerBag);

  return {
    maxBags,
    maxPoundsN,
    maxRatePer1000SqFt: limit,
  };
}

/**
 * Validate a fertilizer bag analysis
 * 
 * @param fertilizer - Fertilizer details
 * @returns Validation result
 */
export function validateFertilizerBag(fertilizer: FertilizerBag): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (fertilizer.nitrogenPercent < 0 || fertilizer.nitrogenPercent > 100) {
    errors.push('Nitrogen percentage must be between 0 and 100');
  }
  if (fertilizer.phosphorusPercent < 0 || fertilizer.phosphorusPercent > 100) {
    errors.push('Phosphorus percentage must be between 0 and 100');
  }
  if (fertilizer.potassiumPercent < 0 || fertilizer.potassiumPercent > 100) {
    errors.push('Potassium percentage must be between 0 and 100');
  }
  if (fertilizer.bagWeightLbs <= 0) {
    errors.push('Bag weight must be greater than 0 lbs');
  }
  if (!['quick-release', 'slow-release'].includes(fertilizer.releaseType)) {
    errors.push('Release type must be either "quick-release" or "slow-release"');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
