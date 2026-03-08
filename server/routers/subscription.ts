import { z } from 'zod';
import { publicProcedure, router } from '@/server/_core/trpc';
import { ENV } from '@/server/_core/env';

/**
 * RevenueCat Subscription Router
 * Handles server-side subscription verification and management
 */

export const subscriptionRouter = router({
  /**
   * Get user's subscription status from RevenueCat
   */
  getStatus: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        if (!ENV.revenueCatApiKey) {
          throw new Error('RevenueCat API key not configured');
        }

        const response = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${input.userId}`,
          {
            headers: {
              Authorization: `Bearer ${ENV.revenueCatApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`RevenueCat API error: ${response.statusText}`);
        }

        const data = await response.json();
        const customerInfo = data.subscriber;

        // Check if user has active pro_access entitlement
        const proEntitlement = customerInfo.entitlements?.active?.pro_access;

        return {
          isPro: !!proEntitlement?.is_active,
          expiresAt: proEntitlement?.expires_date || null,
          autoRenew: proEntitlement?.will_renew || false,
          originalTransactionId: proEntitlement?.original_transaction_id || null,
          managementUrl: customerInfo.management_url || null,
        };
      } catch (error) {
        console.error('Error fetching subscription status:', error);
        throw new Error('Failed to fetch subscription status');
      }
    }),

  /**
   * Verify a purchase receipt
   */
  verifyReceipt: publicProcedure
    .input(
      z.object({
        receipt: z.string(),
        platform: z.enum(['ios', 'android']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        if (!ENV.revenueCatApiKey) {
          throw new Error('RevenueCat API key not configured');
        }

        const response = await fetch(
          'https://api.revenuecat.com/v1/receipts',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${ENV.revenueCatApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              app_user_id: 'user_id', // Should be passed from client
              fetch_token: input.receipt,
              is_restore: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Receipt verification failed: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          success: true,
          customerInfo: data.subscriber,
        };
      } catch (error) {
        console.error('Error verifying receipt:', error);
        throw new Error('Failed to verify receipt');
      }
    }),

  /**
   * Get subscription entitlements
   */
  getEntitlements: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        if (!ENV.revenueCatApiKey) {
          throw new Error('RevenueCat API key not configured');
        }

        const response = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${input.userId}`,
          {
            headers: {
              Authorization: `Bearer ${ENV.revenueCatApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`RevenueCat API error: ${response.statusText}`);
        }

        const data = await response.json();
        const customerInfo = data.subscriber;

        // Return all active entitlements
        const activeEntitlements = Object.entries(customerInfo.entitlements?.active || {})
          .filter(([_, entitlement]: any) => entitlement.is_active)
          .map(([name, entitlement]: any) => ({
            name,
            expiresAt: entitlement.expires_date,
            autoRenew: entitlement.will_renew,
          }));

        return {
          entitlements: activeEntitlements,
          isPro: activeEntitlements.some((e) => e.name === 'pro_access'),
        };
      } catch (error) {
        console.error('Error fetching entitlements:', error);
        throw new Error('Failed to fetch entitlements');
      }
    }),

  /**
   * Log subscription event for analytics
   */
  logEvent: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        eventType: z.enum([
          'purchase',
          'renewal',
          'cancellation',
          'restoration',
          'upgrade',
          'downgrade',
        ]),
        productId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Log to your analytics service
        console.log('Subscription event:', {
          userId: input.userId,
          eventType: input.eventType,
          productId: input.productId,
          timestamp: new Date().toISOString(),
          ...input.metadata,
        });

        // You can send this to your analytics backend
        // await analyticsService.logEvent(input);

        return { success: true };
      } catch (error) {
        console.error('Error logging subscription event:', error);
        throw new Error('Failed to log event');
      }
    }),
});
