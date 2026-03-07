# FL-GreenGuard: Mobile App Interface Design

## Overview
FL-GreenGuard is a professional landscaping app for Florida's 70,000+ licensed commercial fertilizer applicators. The app enforces FDACS compliance through intelligent tools and real-time monitoring, transforming fertilizer application from a risky activity into an audit-proof, professional practice.

**Design Principle:** Designed for one-handed usage in portrait orientation (9:16). Every action is 2-3 taps maximum. The app feels like a first-party iOS tool—clean, authoritative, and trustworthy.

---

## Screen List

### 1. **Onboarding / Auth Screen**
- **Purpose:** First-time setup and login
- **Content:** 
  - License number input (LF###)
  - GI-BMP Certificate upload (PDF)
  - Quick tutorial on the "Ring of Responsibility"
- **Functionality:** Validate license, store certificate in Digital Wallet

### 2. **Home Screen (Dashboard)**
- **Purpose:** Daily hub for all app functions
- **Content:**
  - Quick stats: "Jobs This Week," "Compliance Score," "Audit-Ready Status"
  - Three action cards:
    - "Start New Job" (GPS + Calculator)
    - "View Audit Logs" (Offline sync status)
    - "Digital Wallet" (License + Certificate)
  - Weather widget (wind speed, temperature)
  - "Ring of Responsibility" status indicator (GPS lock)
- **Functionality:** Navigation hub; real-time GPS status

### 3. **New Job Screen**
- **Purpose:** Create a fertilizer application job
- **Content:**
  - Job name input (e.g., "Lakewood Estates - Turf")
  - Property address (auto-fill from GPS)
  - Turf area (sq ft)
  - Fertilizer bag analysis:
    - N (nitrogen) percentage
    - P (phosphorus) percentage
    - K (potassium) percentage
  - Application type selector (Granular / Liquid)
- **Functionality:** Trigger N-Calculator; enable GPS buffer zone

### 4. **N-Calculator Screen**
- **Purpose:** Calculate compliant nitrogen application rates
- **Content:**
  - Input fields:
    - Bag N% (from fertilizer label)
    - Turf area (sq ft)
    - Quick-release % (default: 0.5 lb/1000 sq ft max)
  - Real-time calculation display:
    - "Pounds of N to apply"
    - "Bags needed"
    - "Compliance status" (Green = OK, Red = Over limit)
  - Warning if exceeds 0.5 lb/1000 sq ft
- **Functionality:** FDACS-compliant math; prevent over-application

### 5. **GPS Buffer Zone Screen (Ring of Responsibility)**
- **Purpose:** Real-time GPS monitoring during application
- **Content:**
  - Map view with:
    - Current location (blue dot)
    - 10 ft buffer zone around water bodies (red ring)
    - Water body markers (lakes, streams, wetlands)
  - Live GPS accuracy indicator
  - "Keep 10 ft from water" alert (haptic + visual)
  - Start/Stop application timer
- **Functionality:** GPS tracking; buffer zone alerts; offline map caching

### 6. **Audit Log Screen**
- **Purpose:** Record and review all applications
- **Content:**
  - List of past jobs:
    - Date, time, location
    - Nitrogen applied
    - Wind speed at time of application
    - Distance from water
    - Sync status (cloud icon = synced, hourglass = pending)
  - Tap to view full details
  - Export as PDF for inspections
- **Functionality:** Offline-first logging; Supabase sync; PDF export

### 7. **Digital Wallet Screen**
- **Purpose:** Store and display licenses
- **Content:**
  - GI-BMP Certificate (PDF preview)
  - LF License (photo or PDF)
  - Expiration dates with renewal reminders
  - "Show for Inspection" button (full-screen display mode)
- **Functionality:** Offline access; PDF/image storage in AsyncStorage

### 8. **Settings Screen**
- **Purpose:** Account and app configuration
- **Content:**
  - Profile: Name, License #, Email
  - Subscription status ($4.99/mo Pro)
  - "Restore Purchase" button (for new devices)
  - App version, About
  - Logout
- **Functionality:** Subscription management; account recovery

---

## Primary Content and Functionality

### **Smart N-Calculator**
- **Input:** Fertilizer bag analysis (N%, P%, K%) + turf area (sq ft)
- **Logic:** 
  - Max quick-release N = 0.5 lb per 1,000 sq ft (FDACS rule)
  - Slow-release N = additional allowance (depends on product type)
  - Calculate: (Bag N% ÷ 100) × Bag Weight = Pounds of N per bag
  - Divide by turf area to get application rate
- **Output:** "Bags needed," "Compliance status" (Green/Red)
- **Compliance:** Prevents over-application; audit-proof

### **Ring of Responsibility (GPS Buffer Zone)**
- **Input:** Real-time GPS location
- **Logic:**
  - Maintain 10 ft buffer from water bodies (streams, lakes, wetlands)
  - Alert user if they drift within 10 ft
  - Log GPS coordinates and distance at time of application
- **Output:** Visual map, haptic alerts, audit log entry
- **Compliance:** Prevents runoff into water; FDACS requirement

### **Audit-Proof Logs**
- **Input:** Job data (location, N applied, wind speed, temperature, timestamp)
- **Logic:**
  - Auto-capture: GPS, wind speed (from weather API), temperature
  - Offline storage: AsyncStorage (local JSON)
  - Sync to Supabase when online
  - Timestamp all entries
- **Output:** Searchable log; PDF export for inspections
- **Compliance:** Inspectors can verify all applications

### **Digital Wallet**
- **Input:** GI-BMP Certificate (PDF), LF License (photo/PDF)
- **Logic:**
  - Store locally in AsyncStorage
  - Display full-screen for inspections
  - Reminder alerts for expiration dates
- **Output:** Instant proof of credentials during field inspections
- **Compliance:** No need to carry physical documents

---

## Key User Flows

### **Flow 1: Start a New Job**
1. User taps "Start New Job" on Home Screen
2. App requests GPS permission (if first time)
3. User enters job name, property address (auto-filled from GPS)
4. User enters turf area (sq ft)
5. User scans or manually enters fertilizer bag analysis (N%, P%, K%)
6. App navigates to N-Calculator Screen
7. User reviews compliance status (Green = OK)
8. User taps "Begin Application"
9. App opens GPS Buffer Zone Screen with live map
10. User applies fertilizer while monitoring buffer zone
11. User taps "End Application"
12. App logs job to Audit Log with all metadata (GPS, wind, temp, timestamp)

### **Flow 2: Inspection Scenario**
1. Inspector asks to see credentials
2. User opens Digital Wallet
3. User taps "Show for Inspection"
4. Full-screen GI-BMP Certificate and LF License displayed
5. Inspector asks to see application logs
6. User opens Audit Log
7. User taps "Export as PDF"
8. App generates PDF with all jobs from past 30 days
9. Inspector reviews compliance (nitrogen rates, buffer zones, timestamps)

### **Flow 3: Offline Application (Dead Zone)**
1. User starts job in area with no cell signal
2. App saves job data to AsyncStorage
3. User completes application; app logs to local storage
4. User returns to area with signal
5. App automatically syncs to Supabase
6. Sync status indicator shows "Synced" (cloud icon)

---

## Color Choices

| Element | Color | Hex | Purpose |
| --- | --- | --- | --- |
| **Primary** | Florida Green | #2D5F2E | Trust, compliance, nature |
| **Success** | Bright Green | #22C55E | Compliant application, OK status |
| **Warning** | Amber | #F59E0B | Approaching buffer zone |
| **Error** | Red | #EF4444 | Over-limit nitrogen, violation |
| **Water** | Light Blue | #0EA5E9 | Water bodies on map |
| **Background** | White | #FFFFFF | Clean, professional |
| **Surface** | Light Gray | #F5F5F5 | Cards, sections |
| **Text** | Dark Gray | #11181C | Primary text |
| **Muted** | Medium Gray | #687076 | Secondary text, hints |

---

## Design Principles

1. **One-Handed Usage:** All buttons and inputs are within thumb reach (bottom 2/3 of screen)
2. **Clarity Over Decoration:** No unnecessary animations; every element has a purpose
3. **Compliance First:** Calculations and alerts are always visible and unambiguous
4. **Offline-First:** App works without internet; syncs when available
5. **Audit-Ready:** Every action is logged with timestamp, location, and metadata
6. **Professional Tone:** Language is direct, authoritative, and trustworthy (like a first-party iOS app)

---

## Accessibility Notes

- All text meets WCAG AA contrast standards
- Haptic feedback for critical alerts (buffer zone, over-limit)
- Large touch targets (min 44pt)
- Clear error messages with actionable solutions
- Dark mode support (automatic via theme)

