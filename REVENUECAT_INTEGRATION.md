# RevenueCat Integration Guide

This document outlines the RevenueCat integration for the FL-GreenGuard app, including setup instructions, configuration, and implementation details.

## Overview

RevenueCat is a backend service that manages in-app subscriptions and purchases across iOS and Android platforms. This integration enables the FL-GreenGuard app to handle Pro subscription ($4.99/month) with server-side verification and cross-platform support.

## Installation

The RevenueCat SDK has been installed via npm:

```bash
pnpm add react-native-purchases
```

## Configuration

### API Keys

Your RevenueCat API key has been configured in the project:

- **API Key**: `test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL`
- **Entitlement ID**: `pro_access`

### Environment Variables

Add the following to your `.env` file:

```env
REVENUECAT_API_KEY=test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL
REVENUECAT_PUBLISHABLE_KEY=<your_publishable_key>
```

### Server Configuration

The environment variables are loaded in `server/_core/env.ts`:

```typescript
export const ENV = {
  // ... other config
  revenueCatApiKey: process.env.REVENUECAT_API_KEY ?? "",
  revenueCatPublishableKey: process.env.REVENUECAT_PUBLISHABLE_KEY ?? "",
};
```

## Implementation

### 1. RevenueCat Service (`lib/revenuecat-service.ts`)

The main service module provides the following functions:

#### Initialization

```typescript
import { initializeRevenueCat, setRevenueCatUserId } from '@/lib/revenuecat-service';

// Initialize RevenueCat on app startup
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
  purchasePackage,
  restorePurchases,
  logoutRevenueCat,
} from '@/lib/revenuecat-service';

// Check if user has active Pro subscription
const isProUser = await isPro();

// Get detailed subscription information
const details = await getSubscriptionDetails();
// Returns: { isPro, expiresAt, daysRemaining, autoRenew, managementUrl }

// Get available packages for purchase
const packages = await getAvailablePackages();

// Purchase a subscription package
await purchasePackage(package);

// Restore purchases (e.g., on new device)
await restorePurchases();

// Logout user
await logoutRevenueCat();
```

#### Subscription Listener

```typescript
import { setupSubscriptionListener } from '@/lib/revenuecat-service';

// Set up listener for subscription changes
const unsubscribe = setupSubscriptionListener((info) => {
  console.log('Subscription updated:', info);
});

// Clean up listener when done
unsubscribe();
```

### 2. App Initialization (`app/_layout.tsx`)

RevenueCat is automatically initialized when the app starts:

```typescript
import { initializeRevenueCat } from "@/lib/revenuecat-service";

// In RootLayout component
useEffect(() => {
  initializeRevenueCat().catch((error) => {
    console.error('Failed to initialize RevenueCat:', error);
  });
}, []);
```

### 3. Settings Screen Integration

Two versions of the settings screen are available:

#### Original Version (`app/(tabs)/settings.tsx`)
- Uses the basic billing service for local subscription management
- Suitable for testing without RevenueCat

#### RevenueCat Version (`app/(tabs)/settings-revenuecat.tsx`)
- Integrates with RevenueCat for production use
- Displays available packages for purchase
- Handles purchase flow with error handling
- Shows subscription status and management options

To use the RevenueCat version, replace the import in your settings route:

```typescript
// Change from:
import SettingsScreen from '@/app/(tabs)/settings';

// To:
import SettingsScreen from '@/app/(tabs)/settings-revenuecat';
```

## Platform-Specific Setup

### iOS Setup

1. **Configure App Store Connect**:
   - Create an App Store Connect app record
   - Set up In-App Purchase products
   - Configure the Pro subscription product with identifier matching RevenueCat

2. **Update `app.config.ts`**:
   - Bundle ID is already configured: `space.manus.fl.greenguard.t20260307054331`
   - Ensure it matches your App Store Connect app

3. **Build Configuration**:
   ```bash
   eas build --platform ios --profile production
   ```

### Android Setup

1. **Configure Google Play Console**:
   - Create a Google Play app record
   - Set up In-App Products
   - Configure the Pro subscription with identifier matching RevenueCat

2. **Update `app.config.ts`**:
   - Package name is already configured: `space.manus.fl.greenguard.t20260307054331`
   - Ensure it matches your Google Play app

3. **Build Configuration**:
   ```bash
   eas build --platform android --profile production
   ```

## RevenueCat Dashboard Configuration

1. **Create Products in RevenueCat**:
   - Go to [RevenueCat Dashboard](https://app.revenuecat.com)
   - Create a product for the Pro subscription
   - Set entitlement to `pro_access`

2. **Link App Store & Google Play**:
   - Configure App Store Connect credentials
   - Configure Google Play credentials
   - Map products to store SKUs

3. **Set Up Webhooks** (Optional):
   - Configure webhooks to notify your backend of subscription changes
   - Useful for server-side subscription verification

## Testing

### Local Testing

1. **iOS Simulator**:
   ```bash
   pnpm ios
   ```

2. **Android Emulator**:
   ```bash
   pnpm android
   ```

### Test Accounts

- **iOS**: Use TestFlight with test user accounts
- **Android**: Use Google Play Console test accounts

### Sandbox Testing

RevenueCat provides sandbox testing capabilities:

```typescript
// In development, use test API key
const REVENUECAT_API_KEY = 'test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL';
```

## Subscription Verification

For production apps, verify subscriptions on the backend:

```typescript
// In your server router
import { ENV } from '@/server/_core/env';

async function verifySubscription(userId: string) {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${ENV.revenueCatApiKey}`,
      },
    }
  );
  
  return response.json();
}
```

## Troubleshooting

### Common Issues

1. **"RevenueCat not initialized"**
   - Ensure `initializeRevenueCat()` is called in app startup
   - Check that API key is correctly set in environment variables

2. **"No offerings available"**
   - Verify products are configured in RevenueCat dashboard
   - Ensure products are linked to App Store/Google Play

3. **"Purchase failed"**
   - Check that test user account is properly configured
   - Verify app is signed with correct certificate (iOS) or keystore (Android)

4. **"Subscription not restored"**
   - Ensure user is logged in with same account on new device
   - Check RevenueCat dashboard for subscription records

## Migration from Existing Billing

If migrating from the existing `billing-service.ts`:

1. **Backup existing data**:
   ```bash
   git checkout -b backup-billing-service
   ```

2. **Update imports**:
   - Replace `billing-service` imports with `revenuecat-service`
   - Update function calls to match new API

3. **Test thoroughly**:
   - Test on both iOS and Android
   - Verify subscription status displays correctly
   - Test purchase flow end-to-end

## Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native Purchases SDK](https://github.com/RevenueCat/react-native-purchases)
- [RevenueCat Dashboard](https://app.revenuecat.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)

## Support

For issues or questions:

1. Check RevenueCat documentation
2. Review error logs in RevenueCat dashboard
3. Test with RevenueCat's sandbox environment
4. Contact RevenueCat support at support@revenuecat.com
