# RevenueCat Integration Setup Checklist

This checklist guides you through completing the RevenueCat integration for FL-GreenGuard.

## Phase 1: Environment Setup

- [ ] **Install Dependencies**
  - RevenueCat SDK installed: `react-native-purchases@^9.11.2`
  - Run `pnpm install` to ensure all dependencies are installed

- [ ] **Configure Environment Variables**
  - Add `REVENUECAT_API_KEY` to `.env` file
  - Add `REVENUECAT_PUBLISHABLE_KEY` to `.env` file (if available)
  - Verify variables are loaded in `server/_core/env.ts`

- [ ] **Update App Configuration**
  - Review `app.config.ts` for correct bundle ID and package name
  - iOS Bundle ID: `space.manus.fl.greenguard.t20260307054331`
  - Android Package: `space.manus.fl.greenguard.t20260307054331`

## Phase 2: RevenueCat Dashboard Setup

- [ ] **Create RevenueCat Account**
  - Sign up at https://app.revenuecat.com
  - Create a new project for FL-GreenGuard

- [ ] **Configure Products**
  - Create a subscription product for Pro plan
  - Set product identifier to match your store SKU
  - Create entitlement: `pro_access`
  - Link entitlement to the Pro subscription product

- [ ] **Link App Stores**
  - **iOS**:
    - Add App Store Connect credentials
    - Create App Store app record
    - Configure In-App Purchase product
  - **Android**:
    - Add Google Play credentials
    - Create Google Play app record
    - Configure In-App Product

- [ ] **Configure Webhooks** (Optional)
  - Set up webhooks for subscription events
  - Configure backend URL to receive notifications
  - Test webhook delivery

## Phase 3: Code Integration

- [ ] **Review Service Implementation**
  - Check `lib/revenuecat-service.ts` for completeness
  - Verify all required functions are implemented
  - Review error handling and logging

- [ ] **App Initialization**
  - Verify `app/_layout.tsx` initializes RevenueCat
  - Check for proper error handling in initialization

- [ ] **Settings Screen**
  - Choose between original or RevenueCat version
  - Update imports if using RevenueCat version
  - Test UI rendering and interactions

- [ ] **User ID Management**
  - Implement user ID tracking in auth flow
  - Call `setRevenueCatUserId()` after user login
  - Ensure user ID is consistent across sessions

## Phase 4: Testing

- [ ] **Local Development Testing**
  - Run app on iOS simulator: `pnpm ios`
  - Run app on Android emulator: `pnpm android`
  - Verify RevenueCat initializes without errors
  - Test subscription status display

- [ ] **Test Purchases** (Sandbox)
  - **iOS**:
    - Use TestFlight with test user account
    - Attempt purchase of Pro subscription
    - Verify subscription status updates
  - **Android**:
    - Use Google Play Console test account
    - Attempt purchase of Pro subscription
    - Verify subscription status updates

- [ ] **Test Restore Purchases**
  - Test restore on new device/simulator
  - Verify subscription is restored correctly
  - Check subscription status displays properly

- [ ] **Test Error Scenarios**
  - Cancel purchase mid-flow
  - Test with invalid API key
  - Test with no network connection
  - Verify error messages are user-friendly

## Phase 5: Backend Integration

- [ ] **Subscription Verification**
  - Implement server-side subscription verification
  - Create API endpoint to check user subscription status
  - Use RevenueCat API for verification

- [ ] **Database Schema** (if needed)
  - Add subscription tracking to user table
  - Store subscription expiration date
  - Track subscription status changes

- [ ] **Audit Logging**
  - Log subscription purchases
  - Log subscription cancellations
  - Log subscription renewals
  - Log restore purchase events

## Phase 6: Production Preparation

- [ ] **Security Review**
  - Verify API keys are not hardcoded
  - Use environment variables for all secrets
  - Review error messages for sensitive data leaks
  - Ensure HTTPS is used for all API calls

- [ ] **Performance Testing**
  - Test subscription status fetching performance
  - Monitor network requests
  - Optimize caching strategy
  - Test with slow network conditions

- [ ] **Documentation**
  - Update README with subscription features
  - Document Pro features and benefits
  - Create user guide for subscription management
  - Document troubleshooting steps

- [ ] **Compliance**
  - Review App Store subscription requirements
  - Review Google Play subscription requirements
  - Ensure privacy policy mentions subscriptions
  - Ensure terms of service cover subscriptions

## Phase 7: Deployment

- [ ] **Build for iOS**
  - Build with EAS: `eas build --platform ios --profile production`
  - Submit to App Store
  - Wait for review and approval
  - Monitor for any subscription-related issues

- [ ] **Build for Android**
  - Build with EAS: `eas build --platform android --profile production`
  - Submit to Google Play
  - Wait for review and approval
  - Monitor for any subscription-related issues

- [ ] **Monitor Post-Launch**
  - Check RevenueCat dashboard for subscription metrics
  - Monitor error logs for issues
  - Track subscription conversion rate
  - Respond to user feedback

## Phase 8: Ongoing Maintenance

- [ ] **Regular Monitoring**
  - Review subscription metrics weekly
  - Check for failed renewals
  - Monitor customer support tickets
  - Track churn rate

- [ ] **Updates**
  - Keep `react-native-purchases` SDK updated
  - Review RevenueCat changelog for updates
  - Test updates in staging before production
  - Update documentation as needed

- [ ] **Optimization**
  - Analyze subscription conversion funnel
  - A/B test pricing if needed
  - Optimize Pro feature offerings
  - Improve user onboarding for Pro features

## Quick Reference

### Key Files

- **Service**: `lib/revenuecat-service.ts`
- **Settings UI**: `app/(tabs)/settings-revenuecat.tsx`
- **App Init**: `app/_layout.tsx`
- **Config**: `server/_core/env.ts`
- **Documentation**: `REVENUECAT_INTEGRATION.md`

### Important Constants

- **API Key**: `test_asnhboBBIIKCKLNnFBzlObcXyNPsk_uEAjjuRgeeUrQnvHHZBSFkpWQvJPL`
- **Entitlement ID**: `pro_access`
- **Bundle ID**: `space.manus.fl.greenguard.t20260307054331`
- **Subscription Price**: $4.99/month

### Useful Commands

```bash
# Install dependencies
pnpm install

# Run on iOS
pnpm ios

# Run on Android
pnpm android

# Build for production
pnpm build

# Type check
pnpm check

# Format code
pnpm format
```

### Support Resources

- [RevenueCat Docs](https://docs.revenuecat.com/)
- [React Native Purchases GitHub](https://github.com/RevenueCat/react-native-purchases)
- [RevenueCat Dashboard](https://app.revenuecat.com)
- [RevenueCat Support](support@revenuecat.com)

---

**Last Updated**: March 7, 2026  
**Status**: Ready for Implementation
