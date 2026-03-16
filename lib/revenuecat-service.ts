/**
 * FL-GreenGuard: RevenueCat Service
 *
 * Handles in-app purchases and subscription management via RevenueCat.
 * Supports both iOS and Android platforms.
 */

import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_KEY ??
  'test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL1192048fa965d0dab87a32e8c2cd49cab7fc928ca92a0a919a1180f5171f9cea';

/** Entitlement identifier for Pro tier */
export const PRO_ENTITLEMENT_ID = 'pro_access';

/** Monthly Pro subscription product ID */
export const PRO_MONTHLY_PRODUCT_ID = 'fl_greenguard_pro_monthly';

export interface RevenueCatCustomerInfo {
  isPro: boolean;
  expiresAt: string | null;
  autoRenew: boolean;
  originalTransactionId: string | null;
  managementUrl: string | null;
}

/**
 * Initialize RevenueCat SDK. Must be called once at app startup.
 * Gracefully skips if the API key is not yet configured.
 */
export async function initializeRevenueCat(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn(
      '[RevenueCat] EXPO_PUBLIC_REVENUECAT_KEY is not set — subscription features disabled.\n' +
      'Get your key at https://app.revenuecat.com and add it to your .env file.'
    );
    return; // Do not crash — app works without subscriptions
  }

  try {
    if (__DEV__) {
      await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    console.log('[RevenueCat] Initialized successfully.');
  } catch (error) {
    console.error('[RevenueCat] Failed to initialize:', error);
    // Don't re-throw — a billing failure should never crash the app
  }
}

/**
 * Get current customer info and entitlement status.
 */
export async function getCustomerInfo(): Promise<RevenueCatCustomerInfo> {
  try {
    const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
    const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];

    return {
      isPro: !!proEntitlement,
      expiresAt: proEntitlement?.expirationDate ?? null,
      autoRenew: proEntitlement?.willRenew ?? false,
      originalTransactionId: proEntitlement?.originalTransactionIdentifier ?? null,
      managementUrl: customerInfo.managementURL ?? null,
    };
  } catch (error) {
    console.error('[RevenueCat] Error fetching customer info:', error);
    return {
      isPro: false,
      expiresAt: null,
      autoRenew: false,
      originalTransactionId: null,
      managementUrl: null,
    };
  }
}

/**
 * Fetch available packages from RevenueCat.
 */
export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (error) {
    console.error('[RevenueCat] Error fetching offerings:', error);
    return [];
  }
}

/**
 * Purchase the Pro subscription package.
 */
export async function purchaseProSubscription(
  pkg: PurchasesPackage
): Promise<RevenueCatCustomerInfo> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];

    return {
      isPro: !!proEntitlement,
      expiresAt: proEntitlement?.expirationDate ?? null,
      autoRenew: proEntitlement?.willRenew ?? false,
      originalTransactionId: proEntitlement?.originalTransactionIdentifier ?? null,
      managementUrl: customerInfo.managementURL ?? null,
    };
  } catch (error: any) {
    if (error?.userCancelled) {
      throw new Error('Purchase cancelled by user');
    }
    console.error('[RevenueCat] Purchase failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases (required for App Store guidelines).
 */
export async function restoreRevenueCatPurchases(): Promise<RevenueCatCustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];

    return {
      isPro: !!proEntitlement,
      expiresAt: proEntitlement?.expirationDate ?? null,
      autoRenew: proEntitlement?.willRenew ?? false,
      originalTransactionId: proEntitlement?.originalTransactionIdentifier ?? null,
      managementUrl: customerInfo.managementURL ?? null,
    };
  } catch (error) {
    console.error('[RevenueCat] Error restoring purchases:', error);
    throw error;
  }
}

/**
 * Set the RevenueCat user ID (call after login).
 */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log('[RevenueCat] User identified:', userId);
  } catch (error) {
    console.error('[RevenueCat] Failed to identify user:', error);
  }
}

/**
 * Reset RevenueCat user (call after logout).
 */
export async function resetRevenueCatUser(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('[RevenueCat] User reset (logged out).');
  } catch (error) {
    console.error('[RevenueCat] Failed to reset user:', error);
  }
}
