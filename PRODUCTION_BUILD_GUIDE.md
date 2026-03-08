# Production Build Guide for Google Play Store

This guide provides the exact steps to generate a production `.aab` (Android App Bundle) file for the Google Play Store.

## Prerequisites

Before you start, ensure you have:

1. **EAS CLI Installed**
   ```bash
   npm install -g eas-cli
   ```

2. **Expo Account** - Log in to your Expo account
   ```bash
   eas login
   ```

3. **Google Play Developer Account** - Create one at https://play.google.com/console

4. **RevenueCat Dashboard** - Ensure your `pro_access` product is configured

## Step 1: Configure EAS (First Time Only)

If you haven't configured EAS for this project yet, run:

```bash
eas build:configure
```

This will create the `eas.json` file (which is already in your repository).

## Step 2: Generate the Production Build

Run this command to generate the production `.aab` file:

```bash
eas build --platform android --profile production
```

This will:
- Compile your React Native code to native Android code
- Generate a signed `.aab` (Android App Bundle) file
- Upload it to EAS servers
- Provide you with a download link

**Build time**: Approximately 10-15 minutes

## Step 3: Download the .aab File

Once the build completes, you'll see a message like:

```
Build finished successfully!
Download link: https://eas-builds.s3.us-west-2.amazonaws.com/...
```

Click the link or copy it to download the `.aab` file to your computer.

## Step 4: Upload to Google Play Console

1. **Go to Google Play Console**: https://play.google.com/console
2. **Select your app** (or create a new one if you haven't)
3. **Navigate to "Release" → "Production"**
4. **Click "Create new release"**
5. **Upload the `.aab` file** you downloaded
6. **Fill in the release notes** and other required information
7. **Review and submit for approval**

## Step 5: Set Up In-App Billing in Google Play Console

Before submitting, you MUST create the subscription product:

1. **Go to "Monetization setup" → "Products" → "Subscriptions"**
2. **Click "Create subscription"**
3. **Set the following**:
   - **Product ID**: `pro_access` (MUST match your RevenueCat configuration)
   - **Default price**: $4.99/month
   - **Billing period**: Monthly
   - **Free trial**: Optional (recommended: 7 days)
4. **Save and activate**

## Step 6: Link RevenueCat to Google Play

1. **Go to your RevenueCat dashboard**
2. **Navigate to "Projects" → Your project → "Integrations"**
3. **Add "Google Play Store"**
4. **Follow the instructions to link your Google Play credentials**
5. **Verify that the `pro_access` product is synced**

## Step 7: Submit for Review

Once everything is configured:

1. **Return to Google Play Console**
2. **Complete the "App content" and "Target audience" sections**
3. **Click "Submit for review"**
4. **Wait for approval** (typically 2-4 hours, sometimes up to 24 hours)

## Step 8: Launch to Production

Once approved:

1. **Go to "Release" → "Production"**
2. **Click "Review release"**
3. **Click "Rollout to production"**
4. **Choose rollout percentage** (start with 5-10%, then gradually increase)

## Important Notes

### API Key
- Your production API key is: `test_asnhboBBIIKCKLNnFBzlObcXyNP`
- This is a **test key** - for production, you'll need to generate a production key in RevenueCat

### Version Number
- Your current version is `1.0.0` (set in `app.config.ts`)
- For future updates, increment the version number (e.g., `1.0.1`, `1.1.0`, etc.)

### Bundle ID / Package Name
- **Android Package**: `space.manus.fl.greenguard.t20260307054331`
- This MUST match the package name in Google Play Console

### Signing
- EAS automatically signs your app with a certificate
- You don't need to manually sign the `.aab` file

## Troubleshooting

### Build fails with "Gradle build failed"
- Ensure all dependencies are installed: `pnpm install`
- Check that your `app.config.ts` is valid: `pnpm check`
- Try clearing the cache: `eas build --platform android --profile production --clear-cache`

### "Product not found" error when testing
- Ensure the `pro_access` product is created in Google Play Console
- Ensure it's linked in RevenueCat
- Wait a few minutes for the sync to complete

### "Invalid API key" error
- Verify your RevenueCat API key in `lib/revenuecat-service.ts`
- Ensure it matches your RevenueCat project's API key

### Build takes too long
- EAS builds can take 10-20 minutes depending on server load
- You can check the build status at https://expo.dev/builds

## Next Steps After Launch

1. **Monitor crash reports** in Google Play Console
2. **Track subscription metrics** in RevenueCat dashboard
3. **Respond to user reviews** and feedback
4. **Plan future updates** and features

## Support Resources

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [RevenueCat Documentation](https://docs.revenuecat.com/)

---

**Last Updated**: March 7, 2026  
**Status**: Ready for Production Build  
**Next Step**: Run the build command
