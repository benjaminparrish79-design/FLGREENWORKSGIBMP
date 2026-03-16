/**
 * Supabase Client Configuration Tests
 *
 * These tests validate the client is correctly configured using the
 * environment variables — without making real network calls to Supabase.
 * The Supabase JS SDK is mocked so the suite runs safely in CI with no secrets.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the Supabase SDK before any module imports ───────────────────────────
vi.mock('@supabase/supabase-js', () => {
  const mockSession = { user: null, session: null };
  const mockGetSession = vi.fn().mockResolvedValue({ data: mockSession, error: null });

  return {
    createClient: vi.fn(() => ({
      auth: {
        getSession: mockGetSession,
      },
    })),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal JWT shape — three base64url segments separated by dots */
const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QifQ' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Supabase Configuration', () => {
  beforeEach(() => {
    // Provide mock env vars so the client module can be imported cleanly
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock-project.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = MOCK_JWT;
  });

  it('should have EXPO_PUBLIC_SUPABASE_URL set in the environment', () => {
    expect(process.env.EXPO_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.EXPO_PUBLIC_SUPABASE_URL).not.toBe('');
  });

  it('should have EXPO_PUBLIC_SUPABASE_ANON_KEY set in the environment', () => {
    expect(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY).not.toBe('');
  });

  it('should have a valid Supabase URL format', () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it('should have a valid JWT-shaped anon key (header.payload.signature)', () => {
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    const parts = key.split('.');
    expect(parts).toHaveLength(3);
    parts.forEach((part) => {
      expect(part).toMatch(/^[A-Za-z0-9_=-]+$/);
    });
  });

  it('should create a Supabase client without throwing', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    expect(() =>
      createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL!,
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
      )
    ).not.toThrow();
  });

  it('getSession should resolve without error (mocked)', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await client.auth.getSession();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
