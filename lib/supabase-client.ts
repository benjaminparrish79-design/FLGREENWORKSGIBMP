/**
 * FL-GreenGuard: Supabase Client
 * 
 * Initializes and exports the Supabase client for use throughout the app.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
 * Database schema types
 */
export interface JobRecord {
  id: string;
  user_id: string;
  job_name: string;
  property_address: string;
  turf_area_sq_ft: number;
  nitrogen_percent: number;
  phosphorus_percent: number;
  potassium_percent: number;
  bag_weight_lbs: number;
  bags_applied: number;
  release_type: 'quick-release' | 'slow-release';
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  job_id: string;
  user_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  gps_accuracy_meters: number | null;
  wind_speed_mph: number | null;
  temperature_f: number | null;
  nitrogen_applied_lbs: number;
  distance_to_water_feet: number;
  is_compliant: boolean;
  notes: string | null;
  created_at: string;
}

export interface CertificateRecord {
  id: string;
  user_id: string;
  certificate_type: 'gibmp' | 'lf_license';
  file_path: string;
  file_name: string;
  expiration_date: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  license_number: string;
  full_name: string | null;
  company_name: string | null;
  phone_number: string | null;
  subscription_status: 'free' | 'pro';
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}
