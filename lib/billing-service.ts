/**
 * FL-GreenGuard: In-App Billing Service
 * 
 * Handles Google Play In-App Billing for $4.99/mo Pro subscription
 * Integrates with react-native-iap for subscription management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTION_KEY = 'fl_greenguard_subscription';
const PRO_SKU = 'fl_greenguard_pro_monthly';
const PRO_PRICE = 4.99;

export interface Subscription {
  status: 'free' | 'pro' | 'expired';
  purchaseToken?: string;
  expiresAt?: string;
  autoRenew: boolean;
  lastPurchaseDate?: string;
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<Subscription> {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (data) {
      const subscription = JSON.parse(data) as Subscription;
      
      // Check if subscription has expired
      if (subscription.expiresAt) {
        const expiryDate = new Date(subscription.expiresAt);
        if (new Date() > expiryDate) {
          return { status: 'expired', autoRenew: false };
        }
      }
      
      return subscription;
    }
    
    return { status: 'free', autoRenew: false };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return { status: 'free', autoRenew: false };
  }
}

/**
 * Check if user has active Pro subscription
 */
export async function isPro(): Promise<boolean> {
  const subscription = await getSubscriptionStatus();
  return subscription.status === 'pro';
}

/**
 * Record a successful purchase
 */
export async function recordPurchase(
  purchaseToken: string,
  expiresAt: string,
  autoRenew: boolean = true
): Promise<Subscription> {
  const subscription: Subscription = {
    status: 'pro',
    purchaseToken,
    expiresAt,
    autoRenew,
    lastPurchaseDate: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
    return subscription;
  } catch (error) {
    console.error('Error recording purchase:', error);
    throw error;
  }
}

/**
 * Restore purchases (for new device)
 * In production, this would query Google Play to verify purchases
 */
export async function restorePurchases(): Promise<Subscription> {
  try {
    // In a real app, you would:
    // 1. Call Google Play API with the user's account
    // 2. Verify the purchase token
    // 3. Update the local subscription status
    
    // For now, we'll just return the current status
    return await getSubscriptionStatus();
  } catch (error) {
    console.error('Error restoring purchases:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details for display
 */
export async function getSubscriptionDetails(): Promise<{
  isPro: boolean;
  status: string;
  expiresAt?: string;
  daysRemaining?: number;
  autoRenew: boolean;
}> {
  const subscription = await getSubscriptionStatus();
  const isPro = subscription.status === 'pro';
  
  let daysRemaining: number | undefined;
  if (subscription.expiresAt) {
    const expiryDate = new Date(subscription.expiresAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    isPro,
    status: subscription.status,
    expiresAt: subscription.expiresAt,
    daysRemaining,
    autoRenew: subscription.autoRenew,
  };
}

/**
 * Format price for display
 */
export function formatPrice(): string {
  return `$${PRO_PRICE.toFixed(2)}/month`;
}

/**
 * Get SKU for subscription
 */
export function getProSku(): string {
  return PRO_SKU;
}
