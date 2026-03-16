/**
 * FL-GreenGuard: Compliance Engine
 *
 * Server-side compliance evaluation for fertilizer applications.
 * Applies FDACS state rules plus any active county-level overrides.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceInput {
  /** Inches of rain forecast in next 24 hours */
  rainForecast: number;
  /** Distance from application site to nearest water body (feet) */
  waterDistance: number;
  /** Nitrogen applied in this application (lbs per 1,000 sq ft) */
  nitrogenApplied: number;
  /** Maximum nitrogen allowed per county rules (lbs per 1,000 sq ft) */
  maxNitrogenAllowed: number;
  /** True if today falls within the county blackout season */
  blackoutSeason: boolean;
  /** Optional: release type affects limits */
  releaseType?: 'quick-release' | 'slow-release';
}

export interface ComplianceResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  warnings: string[];
  summary: string;
}

export interface ComplianceViolation {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** FDACS statewide defaults */
const FDACS = {
  /** Minimum setback from water bodies (feet) */
  bufferZoneFt: 10,
  /** Rain threshold — do not apply if > this forecast (inches / 24 h) */
  maxRainForecastInches: 0.5,
  /** Max quick-release N rate (lbs / 1,000 sq ft) */
  quickReleaseLimit: 0.5,
  /** Max slow-release N rate (lbs / 1,000 sq ft) */
  slowReleaseLimit: 1.5,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

/**
 * Evaluate a fertilizer application against FDACS rules and county overrides.
 *
 * @param input - Application parameters to check
 * @returns Full compliance result with any violations and warnings
 */
export function checkCompliance(input: ComplianceInput): ComplianceResult {
  const violations: ComplianceViolation[] = [];
  const warnings: string[] = [];

  // Rule 1 — Blackout season
  if (input.blackoutSeason) {
    violations.push({
      code: 'BLACKOUT_SEASON',
      message: 'Fertilizer application is prohibited during the county blackout season.',
      severity: 'error',
    });
  }

  // Rule 2 — Buffer zone
  if (input.waterDistance < FDACS.bufferZoneFt) {
    violations.push({
      code: 'BUFFER_ZONE_VIOLATION',
      message: `Application is within ${FDACS.bufferZoneFt} ft of a water body (actual: ${input.waterDistance.toFixed(1)} ft).`,
      severity: 'error',
    });
  } else if (input.waterDistance < FDACS.bufferZoneFt * 2) {
    warnings.push(
      `Application is within ${FDACS.bufferZoneFt * 2} ft of a water body. Use extra caution.`
    );
  }

  // Rule 3 — Rain forecast
  if (input.rainForecast > FDACS.maxRainForecastInches) {
    violations.push({
      code: 'RAIN_FORECAST_EXCEEDED',
      message: `Rain forecast of ${input.rainForecast.toFixed(2)}" exceeds the ${FDACS.maxRainForecastInches}" threshold. Application should be rescheduled.`,
      severity: 'error',
    });
  } else if (input.rainForecast > FDACS.maxRainForecastInches * 0.7) {
    warnings.push(
      `Rain forecast (${input.rainForecast.toFixed(2)}") is approaching the ${FDACS.maxRainForecastInches}" limit.`
    );
  }

  // Rule 4 — Nitrogen rate (county override takes precedence; fall back to FDACS)
  const stateLimit =
    input.releaseType === 'slow-release' ? FDACS.slowReleaseLimit : FDACS.quickReleaseLimit;
  const effectiveLimit = Math.min(input.maxNitrogenAllowed, stateLimit);

  if (input.nitrogenApplied > effectiveLimit) {
    violations.push({
      code: 'NITROGEN_LIMIT_EXCEEDED',
      message: `Nitrogen rate of ${input.nitrogenApplied.toFixed(2)} lbs/1,000 sq ft exceeds the limit of ${effectiveLimit.toFixed(2)} lbs/1,000 sq ft.`,
      severity: 'error',
    });
  } else if (input.nitrogenApplied > effectiveLimit * 0.9) {
    warnings.push(
      `Nitrogen rate (${input.nitrogenApplied.toFixed(2)} lbs) is within 10% of the allowed limit.`
    );
  }

  const isCompliant = violations.length === 0;

  const summary = isCompliant
    ? `✓ Application is compliant with all FDACS rules.${warnings.length > 0 ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}`
    : `✗ Application has ${violations.length} violation${violations.length > 1 ? 's' : ''} and cannot proceed.`;

  return { isCompliant, violations, warnings, summary };
}

/**
 * Quick boolean check — useful in middleware guards.
 */
export function isApplicationCompliant(input: ComplianceInput): boolean {
  return checkCompliance(input).isCompliant;
}
