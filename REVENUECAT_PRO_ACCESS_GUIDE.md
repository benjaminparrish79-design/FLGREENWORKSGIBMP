# RevenueCat Pro Access Integration Guide

This guide covers the complete integration of RevenueCat with the `pro_access` product ID for FL-GreenGuard.

## Overview

The RevenueCat integration has been configured to use the `pro_access` product ID as the primary subscription entitlement. This guide explains how to use the implemented features and complete the setup.

## Key Components

### 1. RevenueCat Service (`lib/revenuecat-service.ts`)

The core service module with the following key functions:

#### Initialization

```typescript
import { initializeRevenueCat, setRevenueCatUserId } from '@/lib/revenuecat-service';

// Initialize on app startup (automatic in app/_layout.tsx)
await initializeRevenueCat();

// Set user ID for subscription tracking
await setRevenueCatUserId(userId);
```

#### Subscription Management

```typescript
import {
  getSubscriptionStatus,
  isPro,
  getSubscriptionDetails,
  getProPackage,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecat-service';

// Check if user has Pro subscription
const isProUser = await isPro();

// Get Pro subscription details
const details = await getSubscriptionDetails();
// Returns: { isPro, expiresAt, daysRemaining, autoRenew, managementUrl }

// Get the Pro package for purchase
const proPackage = await getProPackage();

// Purchase Pro subscription
if (proPackage) {
  await purchasePackage(proPackage);
}

// Restore purchases
await restorePurchases();
```

### 2. Settings Screen (`app/(tabs)/settings-pro.tsx`)

The optimized settings screen displays:

- Current subscription status (Free or Pro)
- Days remaining for Pro subscribers
- Auto-renewal status
- Purchase button for free users
- Restore purchase option
- Account and app information
- Logout functionality

To use this screen, update your route:

```typescript
// In app/(tabs)/_layout.tsx or your routing configuration
import SettingsScreen from '@/app/(tabs)/settings-pro';
```

### 3. Pro Subscription Hooks

#### `useProSubscription()`

Main hook for managing subscription state across the app:

```typescript
import { useProSubscription } from '@/hooks/use-pro-subscription';

function MyComponent() {
  const { isPro, isLoading, error, daysRemaining, refresh } = useProSubscription();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <Text>{isPro ? 'Pro User' : 'Free User'}</Text>
      {isPro && <Text>Expires in {daysRemaining} days</Text>}
      <Button onPress={refresh} title="Refresh Status" />
    </View>
  );
}
```

#### `useRequiresPro()`

Check if a feature requires Pro subscription:

```typescript
import { useRequiresPro } from '@/hooks/use-pro-subscription';

function AdvancedAnalytics() {
  const { canAccess, isPro } = useRequiresPro('Advanced Analytics');

  if (!canAccess) {
    return <UpgradePrompt feature="Advanced Analytics" />;
  }

  return <AnalyticsContent />;
}
```

#### `useProDetails()`

Get formatted Pro subscription details:

```typescript
import { useProDetails } from '@/hooks/use-pro-subscription';

function SubscriptionInfo() {
  const { status, expiresAt, daysRemaining, autoRenew } = useProDetails();

  return (
    <View>
      <Text>Status: {status}</Text>
      <Text>Expires: {expiresAt?.toLocaleDateString()}</Text>
      <Text>Days Remaining: {daysRemaining}</Text>
      <Text>Auto-Renew: {autoRenew ? 'Yes' : 'No'}</Text>
    </View>
  );
}
```

### 4. Pro Feature Gate Component

Protect Pro-only features with the `ProFeatureGate` component:

```typescript
import { ProFeatureGate } from '@/components/pro-feature-gate';

function AdvancedReports() {
  return (
    <ProFeatureGate
      featureName="Advanced Reports"
      onUpgradePress={() => navigateToSettings()}
      showLockIcon={true}
    >
      <ReportContent />
    </ProFeatureGate>
  );
}
```

Or use the hook-based alternative:

```typescript
import { useProFeatureAccess } from '@/components/pro-feature-gate';

function AdvancedReports() {
  const { hasAccess, message } = useProFeatureAccess('Advanced Reports');

  if (!hasAccess) {
    return <UpgradePrompt message={message} />;
  }

  return <ReportContent />;
}
```

### 5. Server-Side Subscription Verification

The subscription router (`server/routers/subscription.ts`) provides server-side verification:

#### Get Subscription Status

```typescript
import { trpc } from '@/lib/trpc';

// In your component
const { data: status } = trpc.subscription.getStatus.useQuery({
  userId: currentUserId,
});
```

#### Verify Entitlements

```typescript
const { data: entitlements } = trpc.subscription.getEntitlements.useQuery({
  userId: currentUserId,
});
```

#### Log Subscription Events

```typescript
const logEvent = trpc.subscription.logEvent.useMutation();

// Log a purchase
await logEvent.mutateAsync({
  userId: currentUserId,
  eventType: 'purchase',
  productId: 'pro_access',
  metadata: { price: 4.99, currency: 'USD' },
});
```

## Product Configuration

### RevenueCat Dashboard Setup

1. **Create Product**
   - Go to RevenueCat Dashboard
   - Create a new subscription product
   - Set product identifier to match your store SKU

2. **Create Entitlement**
   - Create entitlement named `pro_access`
   - Link it to the Pro subscription product

3. **Configure Stores**

   **iOS (App Store Connect)**
   - Create subscription product with identifier matching RevenueCat
   - Set price to $4.99/month
   - Configure billing cycle

   **Android (Google Play)**
   - Create subscription product with identifier matching RevenueCat
   - Set price to $4.99/month
   - Configure billing cycle

### Product Identifier Mapping

| Platform | Store SKU | RevenueCat Product | Entitlement |
|----------|-----------|-------------------|------------|
| iOS | com.flgreenguard.pro.monthly | pro_access | pro_access |
| Android | fl_greenguard_pro_monthly | pro_access | pro_access |

## Implementation Examples

### Example 1: Gating a Feature

```typescript
import { useProSubscription } from '@/hooks/use-pro-subscription';
import { ProFeatureGate } from '@/components/pro-feature-gate';

export function AuditLogsScreen() {
  return (
    <ProFeatureGate featureName="Unlimited Audit Logs">
      <ScrollView>
        <AuditLogsList />
      </ScrollView>
    </ProFeatureGate>
  );
}
```

### Example 2: Conditional UI Based on Subscription

```typescript
import { useProSubscription } from '@/hooks/use-pro-subscription';

export function DashboardHeader() {
  const { isPro, daysRemaining } = useProSubscription();

  return (
    <View className="p-4 bg-surface rounded-lg">
      {isPro ? (
        <View>
          <Text className="text-lg font-bold">Pro Subscriber</Text>
          <Text className="text-sm text-muted">
            Renews in {daysRemaining} days
          </Text>
        </View>
      ) : (
        <TouchableOpacity onPress={() => navigateToUpgrade()}>
          <Text className="text-lg font-bold text-primary">
            Upgrade to Pro
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### Example 3: Server-Side Verification

```typescript
// In your API route or server function
import { trpc } from '@/lib/trpc';

export async function checkProAccess(userId: string) {
  try {
    const status = await trpc.subscription.getStatus.query({ userId });
    return status.isPro;
  } catch (error) {
    console.error('Failed to verify Pro status:', error);
    return false;
  }
}
```

## Testing

### Local Testing

1. **iOS Simulator**
   ```bash
   pnpm ios
   ```

2. **Android Emulator**
   ```bash
   pnpm android
   ```

### Test Purchases

**iOS TestFlight**
- Use test user account
- Attempt purchase of Pro subscription
- Verify subscription status updates

**Android Google Play**
- Use test account
- Attempt purchase of Pro subscription
- Verify subscription status updates

### Sandbox Testing

RevenueCat provides sandbox environment for testing without real transactions:

```typescript
// Use test API key (already configured)
const REVENUECAT_API_KEY = 'test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL';
```

## Troubleshooting

### Issue: "No offerings available"

**Solution**: Ensure products are configured in RevenueCat dashboard and linked to App Store/Google Play.

### Issue: "Purchase failed"

**Solution**: 
- Verify test user account is properly configured
- Check app is signed with correct certificate (iOS) or keystore (Android)
- Ensure product identifier matches store configuration

### Issue: "Subscription not restored"

**Solution**:
- Verify user is logged in with same account
- Check RevenueCat dashboard for subscription records
- Try calling `restorePurchases()` manually

### Issue: "Pro features not accessible"

**Solution**:
- Verify `useProSubscription()` hook is working
- Check subscription status in RevenueCat dashboard
- Ensure entitlement ID is `pro_access`

## Files Modified/Created

| File | Purpose |
|------|---------|
| `lib/revenuecat-service.ts` | Core RevenueCat service |
| `app/(tabs)/settings-pro.tsx` | Pro-optimized settings screen |
| `hooks/use-pro-subscription.ts` | Subscription state hooks |
| `components/pro-feature-gate.tsx` | Feature gating component |
| `server/routers/subscription.ts` | Server-side subscription API |
| `server/routers.ts` | Updated to include subscription router |
| `app/_layout.tsx` | Updated to initialize RevenueCat |
| `server/_core/env.ts` | Updated to include RevenueCat config |

## Next Steps

1. **Configure RevenueCat Dashboard**
   - Create products and entitlements
   - Link App Store and Google Play accounts

2. **Update Environment Variables**
   - Add `REVENUECAT_PUBLISHABLE_KEY` to `.env`

3. **Test Thoroughly**
   - Test on iOS simulator and Android emulator
   - Test purchase flow end-to-end
   - Test subscription restoration

4. **Deploy to Production**
   - Build and submit to App Store
   - Build and submit to Google Play
   - Monitor subscription metrics

## Support

For issues or questions:

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native Purchases GitHub](https://github.com/RevenueCat/react-native-purchases)
- [RevenueCat Dashboard](https://app.revenuecat.com)
- [RevenueCat Support](support@revenuecat.com)

---

**Last Updated**: March 7, 2026  
**Status**: Ready for Dashboard Configuration
