/**
 * Database Subscription Service
 * Handles subscription record management and audit logging
 */

import { db } from './db';
import { subscriptions, subscriptionEvents, type InsertSubscription, type InsertSubscriptionEvent } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Create or update a subscription record
 */
export async function upsertSubscription(
  userId: number,
  data: {
    revenueCatCustomerId: string;
    status: 'active' | 'expired' | 'cancelled' | 'pending';
    entitlementId?: string;
    productId?: string;
    expiresAt?: Date;
    autoRenew?: boolean;
    originalTransactionId?: string;
    latestTransactionId?: string;
    purchasedAt?: Date;
    platform?: 'ios' | 'android' | 'web';
    priceInCents?: number;
    currency?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    const subscriptionData: InsertSubscription = {
      userId,
      revenueCatCustomerId: data.revenueCatCustomerId,
      status: data.status,
      entitlementId: data.entitlementId || 'pro_access',
      productId: data.productId,
      expiresAt: data.expiresAt,
      autoRenew: data.autoRenew ? 1 : 0,
      originalTransactionId: data.originalTransactionId,
      latestTransactionId: data.latestTransactionId,
      purchasedAt: data.purchasedAt,
      platform: data.platform,
      priceInCents: data.priceInCents,
      currency: data.currency,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    };

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(subscriptions)
        .set(subscriptionData)
        .where(eq(subscriptions.userId, userId));

      return existing[0];
    } else {
      // Create new subscription
      const result = await db.insert(subscriptions).values(subscriptionData);
      return {
        ...subscriptionData,
        id: result[0],
      };
    }
  } catch (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }
}

/**
 * Get user's subscription
 */
export async function getSubscription(userId: number) {
  try {
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
}

/**
 * Get subscription by RevenueCat customer ID
 */
export async function getSubscriptionByRevenueCatId(revenueCatCustomerId: string) {
  try {
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.revenueCatCustomerId, revenueCatCustomerId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error fetching subscription by RevenueCat ID:', error);
    throw error;
  }
}

/**
 * Check if user has active Pro subscription
 */
export async function hasActiveProSubscription(userId: number): Promise<boolean> {
  try {
    const subscription = await getSubscription(userId);

    if (!subscription) {
      return false;
    }

    // Check if status is active and entitlement is pro_access
    if (subscription.status !== 'active' || subscription.entitlementId !== 'pro_access') {
      return false;
    }

    // Check if subscription has expired
    if (subscription.expiresAt && new Date() > subscription.expiresAt) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking Pro subscription:', error);
    return false;
  }
}

/**
 * Log a subscription event
 */
export async function logSubscriptionEvent(
  userId: number,
  eventData: {
    subscriptionId?: number;
    eventType: 'purchase' | 'renewal' | 'cancellation' | 'upgrade' | 'downgrade' | 'restoration' | 'expiration' | 'failure';
    eventStatus?: 'success' | 'failed' | 'pending';
    previousStatus?: string;
    newStatus?: string;
    amountInCents?: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }
) {
  try {
    const subscription = await getSubscription(userId);

    const eventRecord: InsertSubscriptionEvent = {
      subscriptionId: eventData.subscriptionId || subscription?.id || 0,
      userId,
      eventType: eventData.eventType,
      eventStatus: (eventData.eventStatus || 'success') as 'success' | 'failed' | 'pending',
      previousStatus: eventData.previousStatus,
      newStatus: eventData.newStatus,
      amountInCents: eventData.amountInCents,
      errorMessage: eventData.errorMessage,
      metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null,
    };

    const result = await db.insert(subscriptionEvents).values(eventRecord);

    return {
      ...eventRecord,
      id: result[0],
    };
  } catch (error) {
    console.error('Error logging subscription event:', error);
    throw error;
  }
}

/**
 * Get subscription events for a user
 */
export async function getSubscriptionEvents(userId: number, limit: number = 50) {
  try {
    const events = await db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.userId, userId))
      .orderBy((t) => t.createdAt)
      .limit(limit);

    return events;
  } catch (error) {
    console.error('Error fetching subscription events:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: number, reason?: string) {
  try {
    const subscription = await getSubscription(userId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update subscription status
    await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));

    // Log cancellation event
    await logSubscriptionEvent(userId, {
      subscriptionId: subscription.id,
      eventType: 'cancellation',
      eventStatus: 'success',
      previousStatus: subscription.status,
      newStatus: 'cancelled',
      metadata: { reason },
    });

    return true;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}

/**
 * Expire subscriptions that have passed their expiration date
 */
export async function expireSubscriptions() {
  try {
    const now = new Date();

    // Find subscriptions that should be expired
    const expiredSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          // This is a simplified check - in production, use proper date comparison
        )
      );

    let expiredCount = 0;

    for (const subscription of expiredSubscriptions) {
      if (subscription.expiresAt && subscription.expiresAt < now) {
        await db
          .update(subscriptions)
          .set({ status: 'expired' })
          .where(eq(subscriptions.id, subscription.id));

        await logSubscriptionEvent(subscription.userId, {
          subscriptionId: subscription.id,
          eventType: 'expiration',
          eventStatus: 'success',
          previousStatus: 'active',
          newStatus: 'expired',
        });

        expiredCount++;
      }
    }

    console.log(`Expired ${expiredCount} subscriptions`);
    return expiredCount;
  } catch (error) {
    console.error('Error expiring subscriptions:', error);
    throw error;
  }
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats() {
  try {
    // Get total active Pro subscriptions
    const activeCount = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.entitlementId, 'pro_access')
        )
      );

    // Get total cancelled subscriptions
    const cancelledCount = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'cancelled'));

    // Get total expired subscriptions
    const expiredCount = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'expired'));

    return {
      activeSubscriptions: activeCount.length,
      cancelledSubscriptions: cancelledCount.length,
      expiredSubscriptions: expiredCount.length,
      totalSubscriptions: activeCount.length + cancelledCount.length + expiredCount.length,
    };
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    throw error;
  }
}
