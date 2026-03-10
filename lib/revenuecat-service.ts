/**
 * FL-GreenGuard: RevenueCat Integration Service
 * 
 * Handles subscription management using RevenueCat SDK
 * Manages Pro subscription ($4.99/mo) with server-side verification
 * 
 * ⚠️  API KEY: Set EXPO_PUBLIC_REVENUECAT_KEY in your .env file.
 *     Never paste the real key directly into this file.
 */

import Purchases, {
  PurchasesError,
  CustomerInfo,
  Package,
  EntitlementInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? '';
const PRODUCT_ID = 'pro_access';
const ENTITLEMENT_ID = 'pro_access';
const SUBSCRIPTION_CACHE_KEY = 'revenuecat_subscription_cache';

if (!REVENUECAT_API_KEY) {
  console.warn('⚠️ RevenueCat API Key is missing! Subscriptions will not work. Please set EXPO_PUBLIC_REVENUECAT_KEY in your .env file.');
}

export interface SubscriptionInfo {
  isActive: boolean;
  entitlementId: string;
  expiresAt?: Date;
  autoRenew: boolean;
  originalTransactionId?: string;
  managementUrl?: string;
}

/**
 * Initialize RevenueCat SDK
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.error('RevenueCat API Key is missing. Cannot initialize.');
      return;
    }

    // Set log level to verbose for debugging as recommended
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    // Platform-specific API keys
    const apiKey = REVENUECAT_API_KEY;

    // Configure RevenueCat
    await Purchases.configure({
      apiKey: apiKey,
      appUserID: userId,
    });

    console.log(`RevenueCat initialized successfully on ${Platform.OS}`);
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
    throw error;
  }
}

/**
 * Set the user ID for RevenueCat
 */
export async function setRevenueCatUserId(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log(`RevenueCat user set to: ${userId}`);
  } catch (error) {
    console.error('Error setting RevenueCat user ID:', error);
    throw error;
  }
}

/**
 * Get available packages for purchase
 */
export async function getAvailablePackages(): Promise<Package[]> {
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current === null) {
      console.warn('No current offering available');
      return [];
    }

    // Filter packages to only include the pro_access product
    const proPackages = offerings.current.availablePackages.filter(
      (pkg) => pkg.product.identifier === PRODUCT_ID
    );

    return proPackages.length > 0 ? proPackages : offerings.current.availablePackages;
  } catch (error) {
    console.error('Error fetching available packages:', error);
    throw error;
  }
}

/**
 * Get the Pro package for purchase
 */
export async function getProPackage(): Promise<Package | null> {
  try {
    const packages = await getAvailablePackages();
    return packages.find((pkg) => pkg.product.identifier === PRODUCT_ID) || packages[0] || null;
  } catch (error) {
    console.error('Error fetching Pro package:', error);
    return null;
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionInfo> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return parseCustomerInfo(customerInfo);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    
    // Return cached data if available
    const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    return {
      isActive: false,
      entitlementId: ENTITLEMENT_ID,
      autoRenew: false,
    };
  }
}

/**
 * Check if user has active Pro subscription
 */
export async function isPro(): Promise<boolean> {
  const subscription = await getSubscriptionStatus();
  return subscription.isActive;
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(pkg: Package): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.purchasePackage(pkg);
    
    // Cache the subscription info
    const subscriptionInfo = parseCustomerInfo(customerInfo);
    await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(subscriptionInfo));

    return customerInfo;
  } catch (error) {
    if (error instanceof PurchasesError) {
      if (error.code === PurchasesError.ErrorCode.PurchaseCancelledError) {
        console.log('Purchase cancelled by user');
      } else {
        console.error('Purchase error:', error.message);
      }
    }
    throw error;
  }
}

/**
 * Restore purchases from App Store / Play Store
 */
export async function restorePurchases(): Promise<SubscriptionInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const subscriptionInfo = parseCustomerInfo(customerInfo);
    
    // Cache the restored subscription info
    await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(subscriptionInfo));

    return subscriptionInfo;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    throw error;
  }
}

/**
 * Parse CustomerInfo to SubscriptionInfo
 */
function parseCustomerInfo(customerInfo: CustomerInfo): SubscriptionInfo {
  const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

  if (!entitlement) {
    return {
      isActive: false,
      entitlementId: ENTITLEMENT_ID,
      autoRenew: false,
    };
  }

  return {
    isActive: entitlement.isActive,
    entitlementId: ENTITLEMENT_ID,
    expiresAt: entitlement.expirationDate ? new Date(entitlement.expirationDate) : undefined,
    autoRenew: entitlement.willRenew,
    originalTransactionId: entitlement.originalTransactionId,
    managementUrl: customerInfo.managementURL,
  };
}

/**
 * Get subscription details for display
 */
export async function getSubscriptionDetails(): Promise<{
  isPro: boolean;
  expiresAt?: Date;
  daysRemaining?: number;
  autoRenew: boolean;
  managementUrl?: string;
}> {
  const subscription = await getSubscriptionStatus();

  let daysRemaining: number | undefined;
  if (subscription.expiresAt) {
    const diffTime = subscription.expiresAt.getTime() - new Date().getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    isPro: subscription.isActive,
    expiresAt: subscription.expiresAt,
    daysRemaining,
    autoRenew: subscription.autoRenew,
    managementUrl: subscription.managementUrl,
  };
}

/**
 * Log out the current user
 */
export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    await AsyncStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    console.log('RevenueCat user logged out');
  } catch (error) {
    console.error('Error logging out from RevenueCat:', error);
    throw error;
  }
}

/**
 * Set up listener for subscription changes
 */
export function setupSubscriptionListener(
  onSubscriptionChange: (info: SubscriptionInfo) => void
): () => void {
  const unsubscribe = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    const subscriptionInfo = parseCustomerInfo(customerInfo);
    onSubscriptionChange(subscriptionInfo);
    
    // Cache the updated subscription info
    AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(subscriptionInfo));
  });

  return unsubscribe;
}
