/**
 * FL-GreenGuard: Billing Service
 *
 * Provides a unified API for subscription status, purchase flows,
 * and restore functionality. Wraps the RevenueCat service layer and
 * exposes the types consumed by the Settings screen.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCustomerInfo,
  getAvailablePackages,
  purchaseProSubscription,
  restoreRevenueCatPurchases,
  type RevenueCatCustomerInfo,
} from './revenuecat-service';
import type { PurchasesPackage } from 'react-native-purchases';

const SUBSCRIPTION_CACHE_KEY = 'fl_greenguard_subscription_cache';
const PRO_PRICE_USD = '$4.99';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface Subscription {
  isPro: boolean;
  expiresAt: string | null;
  autoRenew: boolean;
  originalTransactionId: string | null;
  managementUrl: string | null;
  cachedAt: string;
}

export interface SubscriptionDetails {
  isPro: boolean;
  expiresAt: string | null;
  autoRenew: boolean;
  daysRemaining: number;
  managementUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 0;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

async function cacheSubscription(info: RevenueCatCustomerInfo): Promise<Subscription> {
  const sub: Subscription = {
    ...info,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(sub));
  return sub;
}

async function getCachedSubscription(): Promise<Subscription | null> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Subscription;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get current subscription status.
 * Returns a cached value if < 5 minutes old to avoid network calls on
 * every screen mount.
 */
export async function getSubscriptionStatus(): Promise<Subscription | null> {
  const cached = await getCachedSubscription();
  if (cached) {
    const ageMs = Date.now() - new Date(cached.cachedAt).getTime();
    if (ageMs < 5 * 60 * 1000) return cached; // use cache if < 5 min
  }

  try {
    const info = await getCustomerInfo();
    return cacheSubscription(info);
  } catch (error) {
    console.error('[Billing] getSubscriptionStatus failed:', error);
    return cached ?? null; // fall back to stale cache on error
  }
}

/**
 * Get enriched subscription details for display in the Settings screen.
 */
export async function getSubscriptionDetails(): Promise<SubscriptionDetails | null> {
  const sub = await getSubscriptionStatus();
  if (!sub) return null;

  return {
    isPro: sub.isPro,
    expiresAt: sub.expiresAt,
    autoRenew: sub.autoRenew,
    daysRemaining: daysUntil(sub.expiresAt),
    managementUrl: sub.managementUrl,
  };
}

/**
 * Fetch available subscription packages and trigger the purchase flow
 * for the first available Pro package.
 */
export async function purchaseSubscription(): Promise<Subscription> {
  const packages: PurchasesPackage[] = await getAvailablePackages();
  if (packages.length === 0) {
    throw new Error('No subscription packages available');
  }
  const pkg = packages[0]!;
  const info = await purchaseProSubscription(pkg);
  return cacheSubscription(info);
}

/**
 * Restore previous purchases (required by App Store guidelines).
 */
export async function restorePurchases(): Promise<Subscription> {
  const info = await restoreRevenueCatPurchases();
  return cacheSubscription(info);
}

/**
 * Cancel subscription — opens the platform management URL if available,
 * otherwise throws a user-friendly message.
 *
 * Note: Neither Apple nor Google provide a programmatic cancellation API.
 * The standard UX is to deep-link into the OS subscription management page.
 */
export async function cancelSubscription(): Promise<void> {
  const sub = await getSubscriptionStatus();
  if (sub?.managementUrl) {
    const { Linking } = await import('react-native');
    await Linking.openURL(sub.managementUrl);
  } else {
    // Fallback platform-specific URLs
    const { Platform, Linking } = await import('react-native');
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
    await Linking.openURL(url);
  }
}

/**
 * Clears the local subscription cache (e.g., after logout).
 */
export async function clearSubscriptionCache(): Promise<void> {
  await AsyncStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
}

/**
 * Returns the formatted price string for display (e.g., "$4.99/mo").
 * In a full implementation this would come from the StoreKit/Play Billing
 * product details returned by RevenueCat.
 */
export function formatPrice(): string {
  return `${PRO_PRICE_USD}/mo`;
}
