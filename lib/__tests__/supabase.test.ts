import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Configuration', () => {
  it('should successfully connect to Supabase with provided credentials', async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

    // Test connection by fetching auth status
    const { data, error } = await supabase.auth.getSession();

    // Should not throw an error (even if no session exists)
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should have valid Supabase URL format', () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    expect(supabaseUrl).toMatch(/https:\/\/.*\.supabase\.co/);
  });

  it('should have valid Supabase anon key format (JWT)', () => {
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    // JWT format: header.payload.signature
    expect(supabaseAnonKey).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });
});
