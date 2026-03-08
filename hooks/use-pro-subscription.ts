import { useEffect, useState, useCallback } from 'react';
import {
  getSubscriptionStatus,
  getSubscriptionDetails,
  setupSubscriptionListener,
  type SubscriptionInfo,
} from '@/lib/revenuecat-service';

export interface ProSubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  error: Error | null;
  expiresAt?: Date;
  daysRemaining?: number;
  autoRenew: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage Pro subscription status
 * Automatically listens for subscription changes and updates state
 */
export function useProSubscription(): ProSubscriptionState {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [details, setDetails] = useState<any>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [status, det] = await Promise.all([
        getSubscriptionStatus(),
        getSubscriptionDetails(),
      ]);
      setIsPro(status.isActive);
      setDetails(det);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Error refreshing subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Set up listener for subscription changes
    const unsubscribe = setupSubscriptionListener((info: SubscriptionInfo) => {
      setIsPro(info.isActive);
      // Refresh details when subscription changes
      getSubscriptionDetails().then(setDetails).catch(console.error);
    });

    return () => {
      unsubscribe();
    };
  }, [refresh]);

  return {
    isPro,
    isLoading,
    error,
    expiresAt: details?.expiresAt,
    daysRemaining: details?.daysRemaining,
    autoRenew: details?.autoRenew ?? false,
    refresh,
  };
}

/**
 * Hook to check if a feature requires Pro subscription
 */
export function useRequiresPro(featureName: string): {
  canAccess: boolean;
  isPro: boolean;
  isLoading: boolean;
} {
  const subscription = useProSubscription();

  return {
    canAccess: subscription.isPro,
    isPro: subscription.isPro,
    isLoading: subscription.isLoading,
  };
}

/**
 * Hook to get Pro subscription details for display
 */
export function useProDetails() {
  const subscription = useProSubscription();

  return {
    status: subscription.isPro ? 'pro' : 'free',
    expiresAt: subscription.expiresAt,
    daysRemaining: subscription.daysRemaining,
    autoRenew: subscription.autoRenew,
    isLoading: subscription.isLoading,
    error: subscription.error,
    refresh: subscription.refresh,
  };
}
