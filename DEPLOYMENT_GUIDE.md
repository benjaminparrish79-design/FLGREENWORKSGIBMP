# FL-GreenGuard: Deployment Guide

## Pre-Deployment Checklist

Before submitting to Google Play Store, ensure:

- [ ] All features tested on Android device
- [ ] App version set to 1.0.0 in app.config.ts
- [ ] Logo and branding assets in place
- [ ] Supabase project configured and tested
- [ ] Google Play Developer account created
- [ ] Release notes reviewed and finalized
- [ ] Privacy policy and terms of service prepared
- [ ] Screenshots captured for Play Store listing

---

## Step 1: Set Up Google Play Developer Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new developer account ($25 one-time fee)
3. Complete your profile with:
   - Developer name: Benjamin Parrish
   - Email: benjaminparrish79@gmail.com
   - Phone: [Your phone number]
   - Address: [Your address]
4. Accept Google Play Developer Program Policies
5. Set up payment method for app fees

---

## Step 2: Create App in Google Play Console

1. Click **Create App**
2. Enter app name: **FL-GreenGuard**
3. Select category: **Business**
4. Select content rating: **Everyone**
5. Complete the app questionnaire
6. Save and proceed

---

## Step 3: Build the APK/AAB with EAS

### Install EAS CLI
```bash
npm install -g eas-cli
```

### Log in to Expo
```bash
eas login
```

### Configure EAS for Android
```bash
eas build:configure --platform android
```

### Build for Google Play (AAB format)
```bash
eas build --platform android --release
```

This will:
- Build the app in release mode
- Generate an Android App Bundle (AAB)
- Upload to EAS servers
- Provide a download link when complete

**Build time:** 10-15 minutes

---

## Step 4: Download and Sign the Build

1. Once the build completes, download the AAB file
2. The app will be automatically signed with your Expo credentials
3. Save the AAB file locally for upload to Play Store

---

## Step 5: Upload to Google Play Console

### In Google Play Console:

1. Go to **Your App → Release → Production**
2. Click **Create new release**
3. Upload the AAB file
4. Add release notes:
   ```
   🚀 Official Launch: The Masterpiece is Live
   
   ✨ What's New:
   - Smart N-Calculator (FDACS-compliant nitrogen math)
   - Ring of Responsibility (GPS buffer zones)
   - Audit-Proof Logs (offline-first with cloud sync)
   - Digital Wallet (certificate storage)
   - Pro Subscription ($4.99/month)
   
   See full release notes in the app.
   ```
5. Click **Save** and **Review release**
6. Review all details and click **Start rollout to Production**

---

## Step 6: Complete Store Listing

### App Details
- **Title:** FL-GreenGuard
- **Short description:** FDACS-compliant nitrogen calculator, GPS buffer zones, audit logs for landscapers
- **Full description:** [Use content from PLAY_STORE_LISTING.md]
- **Category:** Business
- **Content rating:** Everyone

### Graphics
- **App icon:** 512x512 PNG (use your generated logo)
- **Feature graphic:** 1024x500 PNG
- **Screenshots:** 4-5 screenshots (1080x1920 or 1440x2560)
- **Promo video:** Optional (YouTube video URL)

### Content Rating
- Complete the content rating questionnaire
- Submit for rating

### Pricing & Distribution
- **Pricing:** Free
- **In-app purchases:** Enable for Pro subscription ($4.99/month)
- **Countries:** Select all or specific regions
- **Device categories:** Phones and tablets

### Contact Details
- **Email:** support@flgreenguard.com
- **Website:** https://flgreenguard.com (optional)
- **Privacy policy:** [Link to your privacy policy]

---

## Step 7: Set Up In-App Billing

### In Google Play Console:

1. Go to **Monetization → Products → In-app products**
2. Click **Create product**
3. Set up subscription:
   - **Product ID:** `fl_greenguard_pro_monthly`
   - **Name:** FL-GreenGuard Pro Monthly
   - **Description:** Unlimited audit logs, advanced analytics, priority support
   - **Price:** $4.99/month
   - **Billing period:** Monthly
   - **Free trial:** Optional (e.g., 7 days)
   - **Grace period:** 3 days
   - **Renewal:** Automatic

4. Save and publish

### In Your App (Already Configured):
The billing service in `lib/billing-service.ts` is ready to integrate with Google Play Billing Library. The subscription flow is:
1. User taps "Upgrade to Pro"
2. Google Play Billing dialog appears
3. User completes purchase
4. App records purchase token in AsyncStorage
5. Subscription status synced to Supabase

---

## Step 8: Submit for Review

1. In Google Play Console, go to **Release → Production**
2. Click **Review and rollout**
3. Review all information one final time
4. Click **Rollout to Production**
5. Google will review your app (typically 24-48 hours)
6. Once approved, your app goes live!

---

## Post-Launch Monitoring

### Track Performance
- **Google Play Console Dashboard:** Monitor installs, uninstalls, ratings
- **Supabase Dashboard:** Monitor user data, audit logs, subscriptions
- **Crash reports:** Review and fix any crashes reported by users

### Update Strategy
- **Bug fixes:** Release as soon as possible
- **Features:** Plan quarterly updates
- **Version bumping:** Increment version number in app.config.ts
- **Release notes:** Always include clear release notes

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
eas build --platform android --release --clear-cache
```

### APK Signature Issues
- Ensure you're logged into the same Expo account
- Verify app.config.ts has correct bundle ID

### Play Store Rejects App
- Check content policy compliance
- Verify all permissions are justified
- Ensure privacy policy is accessible
- Test on multiple devices before resubmitting

---

## Important Notes

1. **Bundle ID:** `space.manus.fl.greenguard.t20260307054331`
   - Must match what you submit to Google Play
   - Cannot be changed after first release

2. **Version Code:** Increment automatically by EAS
   - First release: 1
   - Second release: 2, etc.

3. **Signing:** Expo handles app signing automatically
   - You don't need to manage signing keys manually
   - Keys are stored securely in Expo servers

4. **Testing:** Before submitting:
   - Test on Android 6.0+ devices
   - Verify GPS permissions work
   - Test offline functionality
   - Verify Supabase sync
   - Test subscription flow

---

## Next Steps After Launch

1. **Gather feedback** from early users
2. **Monitor crash reports** and fix issues
3. **Respond to reviews** on Google Play
4. **Plan v1.1 updates** with new features
5. **Scale to iOS** using similar process
6. **Build marketing** around the app

---

## Support

For EAS build issues:
- [EAS Documentation](https://docs.expo.dev/build/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Expo Community](https://forums.expo.dev)

---

**Your app is ready. Let's launch it! 🚀**
