# FL-GreenGuard: Development TODO

## Phase 1: Core Infrastructure & Setup
- [x] Configure Supabase connection (database, auth, storage)
- [x] Set up environment variables (.env)
- [x] Create database schema (jobs, logs, users, certificates)
- [x] Implement user authentication (OAuth or email)
- [x] Set up AsyncStorage for offline data
- [x] Configure app branding (logo, colors, app.json)

## Phase 2: Smart N-Calculator
- [x] Create N-Calculator logic module (nitrogen math)
- [x] Build N-Calculator UI screen
- [x] Implement real-time compliance status (Green/Red)
- [x] Add warning for over-limit applications
- [x] Test with sample fertilizer bags (10-10-10, 15-0-15, etc.)
- [x] Validate FDACS 0.5 lb/1000 sq ft rule

## Phase 3: GPS & Ring of Responsibility
- [x] Request location permissions (iOS + Android)
- [x] Integrate GPS tracking (expo-location)
- [x] Create map view with water body markers
- [x] Implement 10 ft buffer zone visualization
- [x] Add haptic alerts when approaching buffer zone
- [x] Cache offline map data
- [x] Log GPS coordinates and distance to water

## Phase 4: Audit-Proof Logs
- [x] Create job logging schema (timestamp, location, N applied, wind, temp)
- [x] Implement offline-first logging (AsyncStorage)
- [x] Build Audit Log UI screen (list of past jobs)
- [x] Add Supabase sync when online
- [x] Implement sync status indicator (cloud icon)
- [x] Create PDF export functionality for inspections

## Phase 5: Digital Wallet
- [x] Implement certificate/license upload (camera or file picker)
- [x] Store PDFs/images in AsyncStorage (offline access)
- [x] Create Digital Wallet UI screen
- [x] Add "Show for Inspection" full-screen display mode
- [x] Implement expiration date reminders
- [x] Add renewal notification alerts

## Phase 6: Home Dashboard
- [x] Create Home Screen UI
- [x] Implement quick stats (Jobs This Week, Compliance Score)
- [x] Add action cards (Start New Job, View Logs, Digital Wallet)
- [x] Integrate weather widget (wind speed, temperature)
- [x] Display GPS lock status indicator
- [x] Add navigation to all other screens

## Phase 7: Subscription & In-App Purchases
- [x] Configure Google Play In-App Billing
- [x] Implement $4.99/mo Pro subscription
- [x] Add "Restore Purchase" button for new devices
- [x] Track subscription status in Supabase
- [x] Lock premium features behind subscription (if applicable)

## Phase 8: Settings & Account Management
- [x] Create Settings screen
- [x] Implement profile management (name, license #, email)
- [x] Add subscription status display
- [x] Implement logout functionality
- [x] Add app version and About section
- [x] Create feedback/support link

## Phase 9: Testing & Compliance
- [x] Test all flows end-to-end (iOS + Android)
- [x] Verify FDACS compliance (nitrogen math, buffer zones)
- [x] Test offline functionality (no cell signal)
- [x] Test Supabase sync (reconnection scenarios)
- [x] Verify PDF export for inspections
- [x] Test in-app purchases (Google Play)

## Phase 10: Release & Deployment
- [x] Generate app logo and branding assets
- [x] Create Release Notes (Version 1.0.0)
- [x] Build APK/AAB for Google Play Console
- [x] Submit to Google Play Store
- [x] Set up monitoring and analytics
- [x] Create user onboarding tutorial
## Phase 11: Post-Launch
- [x] Monitor DAU (Daily Active Users)
- [x] Track conversion rate from email campaign
- [x] Monitor churn and gather user feedback
- [x] Implement feature requests
- [x] Maintain app compliance with FDACS updates

---

## Known Issues & Blockers
- None yet

---

## Notes
- App targets Florida's 70,000+ licensed commercial fertilizer applicators
- Primary use case: Audit-proof logging during fertilizer applications
- Offline-first design (works without internet)
- Professional tone (first-party iOS app feel)
- FDACS compliance is non-negotiable

