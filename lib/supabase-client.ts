/**
 * FL-GreenGuard: Supabase Client
 * 
 * Initializes and exports the Supabase client for use throughout the app.
 * Types are aligned with the Drizzle schema for consistency.
 */

import { createClient } from '@supabase/supabase-js';

// Falls back to the hardcoded project values so the app works even if
// the .env file is not yet loaded (e.g. first Expo Go run).
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://gpfbgllazvxykxoqgopz.supabase.co';

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmJnbGxhenZ4eWt4b3Fnb3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDU2MDEsImV4cCI6MjA4ODQyMTYwMX0.eaWUaDU04WUgTIV2vim7ZwGgnpGoCGi_xsP4HmpKwkE';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

/**
 * Supabase client instance
 * Used for database queries, authentication, and file storage
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database schema types aligned with Drizzle schema
 */

/**
 * Application record - maps to applications table
 * Stores fertilizer application data with compliance information
 */
export interface ApplicationRecord {
  id: number;
  propertyId: number;
  crewId?: number | null;
  userId: number;
  productName?: string | null;
  nitrogenPercent?: number | null;
  applicationRate?: number | null;
  totalNitrogen?: number | null;
  weatherConditions?: string | null;
  bufferZoneVerified?: number | null;
  gpsLat?: string | null;
  gpsLong?: string | null;
  photoUrl?: string | null;
  appliedAt: string;
}

/**
 * Audit log record - derived from applications table
 * Used for tracking and syncing application records
 */
export interface AuditLogRecord {
  id: number;
  propertyId: number;
  userId: number;
  timestamp: string;
  latitude?: string | null;
  longitude?: string | null;
  gpsAccuracyMeters?: number | null;
  windSpeedMph?: number | null;
  temperatureF?: number | null;
  nitrogenAppliedLbs: number;
  distanceToWaterFeet?: number | null;
  isCompliant: boolean;
  notes?: string | null;
  createdAt: string;
}

/**
 * Certificate record - stores uploaded certificates and licenses
 */
export interface CertificateRecord {
  id: number;
  userId: number;
  certificateType: 'gibmp' | 'lf_license' | 'other';
  filePath: string;
  fileName: string;
  expirationDate?: string | null;
  uploadedAt: string;
  createdAt: string;
}

/**
 * User profile - maps to users table
 * Stores user profile information and subscription status
 */
export interface UserProfile {
  id: number;
  openId: string;
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  loginMethod?: string | null;
  role: 'owner' | 'manager' | 'crew' | 'admin';
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}

/**
 * Company record - maps to companies table
 */
export interface CompanyRecord {
  id: number;
  companyName: string;
  ownerUserId: number;
  subscriptionPlan?: string | null;
  stripeCustomerId?: string | null;
  createdAt: string;
}

/**
 * Property record - maps to properties table
 */
export interface PropertyRecord {
  id: number;
  companyId: number;
  address: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  gpsLat?: string | null;
  gpsLong?: string | null;
  squareFootage?: number | null;
  waterBodyDistance?: number | null;
  fertilizerSchedule?: string | null;
  notes?: string | null;
  createdAt: string;
}

/**
 * Type validation utilities
 */

export function validateApplicationRecord(data: unknown): data is ApplicationRecord {
  if (typeof data !== 'object' || data === null) return false;
  const app = data as Record<string, unknown>;
  return (
    typeof app.id === 'number' &&
    typeof app.userId === 'number' &&
    typeof app.propertyId === 'number' &&
    typeof app.appliedAt === 'string'
  );
}

export function validateAuditLogRecord(data: unknown): data is AuditLogRecord {
  if (typeof data !== 'object' || data === null) return false;
  const log = data as Record<string, unknown>;
  return (
    typeof log.id === 'number' &&
    typeof log.userId === 'number' &&
    typeof log.propertyId === 'number' &&
    typeof log.timestamp === 'string' &&
    typeof log.nitrogenAppliedLbs === 'number'
  );
}

export function validateUserProfile(data: unknown): data is UserProfile {
  if (typeof data !== 'object' || data === null) return false;
  const user = data as Record<string, unknown>;
  return (
    typeof user.id === 'number' &&
    typeof user.openId === 'string' &&
    typeof user.email === 'string'
  );
}
