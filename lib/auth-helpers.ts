/**
 * FL-GreenGuard: Auth Helpers
 *
 * Convenience utilities to read the current user's ID and profile
 * from secure storage. Used by services that need the userId at
 * call time rather than through a React hook (e.g., background sync).
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const USER_INFO_KEY = 'manus_user_info';

export interface StoredUserInfo {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
}

/**
 * Returns the currently authenticated user's numeric ID,
 * or null if not logged in.
 */
export async function getCurrentUserId(): Promise<number | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Returns the full stored user profile, or null if not logged in.
 */
export async function getCurrentUser(): Promise<StoredUserInfo | null> {
  try {
    let raw: string | null = null;

    if (Platform.OS === 'web') {
      raw = localStorage.getItem(USER_INFO_KEY);
    } else {
      raw = await SecureStore.getItemAsync(USER_INFO_KEY);
    }

    if (!raw) return null;
    return JSON.parse(raw) as StoredUserInfo;
  } catch (error) {
    console.error('[AuthHelpers] Failed to read user info:', error);
    return null;
  }
}
