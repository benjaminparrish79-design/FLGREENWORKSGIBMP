# FL-GreenGuard Production Readiness Checklist

This document outlines all steps required to move the FL-GreenGuard app from development to production with full RevenueCat integration.

## Phase 1: Database Setup

- [ ] **Create Migration File**
  - Run: `pnpm db:push` to generate migration files
  - This will create the `subscriptions` and `subscriptionEvents` tables
  - Verify migration files are created in `drizzle/migrations/`

- [ ] **Verify Database Connection**
  - Ensure `DATABASE_URL` environment variable is set correctly
  - Test connection: `pnpm db:push --dry-run`
  - Confirm tables are created in your MySQL/TiDB database

- [ ] **Set Up Supabase Integration** (if using Supabase)
  - Create a Supabase project
  - Configure database credentials
  - Update `DATABASE_URL` with Supabase connection string

## Phase 2: RevenueCat Dashboard Configuration

- [ ] **Create RevenueCat Account**
  - Sign up at https://app.revenuecat.com
  - Create a new project for FL-GreenGuard
  - Save your API key and publishable key

- [ ] **Configure Products**
  - Create a subscription product named "Pro"
  - Set product identifier: `pro_access`
  - Set price: $4.99/month
  - Create entitlement: `pro_access`
  - Link entitlement to the Pro product

- [ ] **iOS Configuration**
  - Create App Store Connect account
  - Create new app in App Store Connect
  - Set bundle ID: `space.manus.fl.greenguard.t20260307054331`
  - Create in-app purchase product with identifier `pro_access`
  - Set price to $4.99/month
  - Link App Store Connect credentials to RevenueCat

- [ ] **Android Configuration**
  - Create Google Play Developer account
  - Create new app in Google Play Console
  - Set package name: `space.manus.fl.greenguard.t20260307054331`
  - Create in-app subscription product with identifier `pro_access`
  - Set price to $4.99/month
  - Link Google Play credentials to RevenueCat

- [ ] **Configure Webhooks** (Optional but Recommended)
  - Set webhook URL in RevenueCat dashboard
  - Configure to receive subscription events
  - Implement webhook handler in your backend

## Phase 3: Environment Configuration

- [ ] **Update `.env` File**
  ```env
  # Database
  DATABASE_URL=mysql://user:password@host:port/database
  
  # RevenueCat
  REVENUECAT_API_KEY=test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL
  REVENUECAT_PUBLISHABLE_KEY=your_publishable_key
  
  # OAuth (if using Manus OAuth)
  OAUTH_SERVER_URL=https://oauth.manus.im
  JWT_SECRET=your_jwt_secret
  ```

- [ ] **Update `.env.production` File**
  - Use production RevenueCat API key
  - Use production database URL
  - Use production OAuth credentials

## Phase 4: App Configuration

- [ ] **Review `app.config.ts`**
  - Bundle ID: `space.manus.fl.greenguard.t20260307054331`
  - App name: "FL-GreenGuard"
  - App slug: "fl-greenguard"
  - Verify all permissions are correct

- [ ] **Update Settings Screen**
  - Ensure `app/(tabs)/settings.tsx` uses `settings-pro.tsx` or is updated
  - Test subscription status display
  - Test purchase flow
  - Test restore purchases

- [ ] **Implement Feature Gating**
  - Use `ProFeatureGate` component for Pro-only features
  - Use `useProSubscription` hook to check subscription status
  - Add Pro badge/indicator to Pro features

## Phase 5: Backend Implementation

- [ ] **Database Service**
  - Verify `server/db-subscription-service.ts` is implemented
  - Test subscription CRUD operations
  - Test event logging

- [ ] **Subscription Router**
  - Verify `server/routers/subscription.ts` is implemented
  - Test `getStatus` endpoint
  - Test `getEntitlements` endpoint
  - Test `logEvent` endpoint

- [ ] **Webhook Handler** (if using webhooks)
  - Implement webhook endpoint to receive RevenueCat events
  - Update subscription records in database
  - Log events for audit trail

- [ ] **User Sync**
  - Implement logic to sync user ID with RevenueCat
  - Call `setRevenueCatUserId()` after user login
  - Verify subscription status is fetched on app startup

## Phase 6: Testing

- [ ] **Local Testing**
  - Run app on iOS simulator: `pnpm ios`
  - Run app on Android emulator: `pnpm android`
  - Test without purchase (free user flow)

- [ ] **Sandbox Testing**
  - Use RevenueCat sandbox environment
  - Test purchase flow on iOS (TestFlight)
  - Test purchase flow on Android (Google Play Console)
  - Test subscription restoration
  - Test subscription cancellation
  - Verify database records are created

- [ ] **Error Handling**
  - Test network failure scenarios
  - Test invalid API key
  - Test cancelled purchase
  - Verify error messages are user-friendly

- [ ] **Performance Testing**
  - Test subscription status fetching speed
  - Monitor network requests
  - Test with slow network conditions
  - Verify caching works correctly

## Phase 7: Build and Deployment

- [ ] **iOS Build**
  - Update version number in `app.config.ts`
  - Build with EAS: `eas build --platform ios --profile production`
  - Wait for build to complete
  - Download build and test on physical device
  - Submit to App Store for review
  - Monitor review status
  - Release to App Store

- [ ] **Android Build**
  - Update version number in `app.config.ts`
  - Build with EAS: `eas build --platform android --profile production`
  - Wait for build to complete
  - Download build and test on physical device
  - Submit to Google Play for review
  - Monitor review status
  - Release to Google Play

- [ ] **Backend Deployment**
  - Deploy server code to production
  - Verify all environment variables are set
  - Test API endpoints
  - Monitor logs for errors

## Phase 8: Post-Launch Monitoring

- [ ] **RevenueCat Dashboard**
  - Monitor subscription metrics
  - Check for failed transactions
  - Review customer support tickets
  - Track conversion rate

- [ ] **Database Monitoring**
  - Monitor subscription table growth
  - Check for orphaned records
  - Review subscription events
  - Verify data integrity

- [ ] **App Monitoring**
  - Monitor crash reports
  - Check for subscription-related errors
  - Review user feedback
  - Monitor app performance

- [ ] **Analytics**
  - Track Pro feature usage
  - Monitor subscription churn
  - Analyze user behavior
  - Identify optimization opportunities

## Phase 9: Ongoing Maintenance

- [ ] **Regular Updates**
  - Keep `react-native-purchases` SDK updated
  - Review RevenueCat changelog
  - Update app regularly with new features
  - Monitor for security updates

- [ ] **Subscription Management**
  - Run subscription expiration job regularly
  - Handle failed renewals
  - Respond to customer support tickets
  - Monitor for fraud

- [ ] **Optimization**
  - A/B test pricing if needed
  - Optimize Pro feature offerings
  - Improve user onboarding
  - Analyze subscription metrics

## Critical Files

| File | Purpose | Status |
|------|---------|--------|
| `drizzle/schema.ts` | Database schema with subscription tables | ✅ Created |
| `server/db-subscription-service.ts` | Database service for subscriptions | ✅ Created |
| `server/routers/subscription.ts` | API router for subscription endpoints | ✅ Created |
| `lib/revenuecat-service.ts` | RevenueCat SDK wrapper | ✅ Created |
| `app/(tabs)/settings-pro.tsx` | Pro settings screen | ✅ Created |
| `hooks/use-pro-subscription.ts` | Subscription state hooks | ✅ Created |
| `components/pro-feature-gate.tsx` | Feature gating component | ✅ Created |
| `app.config.ts` | App configuration | ✅ Configured |
| `app/_layout.tsx` | App initialization | ✅ Updated |
| `server/routers.ts` | Main router | ✅ Updated |

## Important Constants

| Constant | Value |
|----------|-------|
| Product ID | `pro_access` |
| Entitlement ID | `pro_access` |
| Bundle ID (iOS) | `space.manus.fl.greenguard.t20260307054331` |
| Package Name (Android) | `space.manus.fl.greenguard.t20260307054331` |
| Subscription Price | $4.99/month |
| RevenueCat API Key | `test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL` |

## Quick Reference Commands

```bash
# Install dependencies
pnpm install

# Generate and run migrations
pnpm db:push

# Run in development
pnpm dev

# Run on iOS
pnpm ios

# Run on Android
pnpm android

# Type check
pnpm check

# Build for production
pnpm build

# Start production server
pnpm start

# Format code
pnpm format

# Lint code
pnpm lint
```

## Support Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native Purchases GitHub](https://github.com/RevenueCat/react-native-purchases)
- [Expo Documentation](https://docs.expo.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/)

## Troubleshooting

### "Database connection failed"
- Verify `DATABASE_URL` is correct
- Check database credentials
- Ensure database server is running
- Test with `pnpm db:push --dry-run`

### "RevenueCat not initialized"
- Verify API key is correct
- Check that `initializeRevenueCat()` is called in `app/_layout.tsx`
- Verify environment variables are loaded

### "No offerings available"
- Ensure products are created in RevenueCat dashboard
- Verify products are linked to App Store/Google Play
- Check that entitlements are configured

### "Purchase failed"
- Verify test account is configured
- Check app is signed with correct certificate (iOS) or keystore (Android)
- Ensure product identifier matches store configuration

---

**Last Updated**: March 7, 2026  
**Status**: Ready for Implementation  
**Next Step**: Database Migration
