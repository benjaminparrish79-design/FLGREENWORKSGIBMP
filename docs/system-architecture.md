# FL Green Works – System Architecture

## Overview
FL Green Works is a compliance platform designed for landscaping professionals to track fertilizer applications and maintain records that align with environmental guidelines.

The system includes:
- company management
- property tracking
- fertilizer application logging
- compliance verification
- inspector-ready reporting
- weather risk monitoring

## Core Database Tables

### `companies`
Fields:
- `id` (uuid)
- `company_name`
- `owner_user_id`
- `subscription_plan`
- `stripe_customer_id`
- `created_at`

### `users`
Fields:
- `id` (uuid)
- `company_id`
- `name`
- `email`
- `password_hash`
- `role`
- `created_at`
Roles:
- `owner`
- `manager`
- `crew`

### `crews`
Fields:
- `id` (uuid)
- `company_id`
- `crew_name`
- `vehicle_id`
- `created_at`

### `properties`
Fields:
- `id` (uuid)
- `company_id`
- `address`
- `city`
- `state`
- `zip`
- `gps_lat`
- `gps_long`
- `square_footage`
- `water_body_distance`
- `created_at`

### `applications`
Fields:
- `id` (uuid)
- `property_id`
- `crew_id`
- `user_id`
- `product_name`
- `nitrogen_percent`
- `application_rate`
- `total_nitrogen`
- `weather_conditions`
- `gps_lat`
- `gps_long`
- `photo_url`
- `applied_at`

### `reports`
Fields:
- `id` (uuid)
- `application_id`
- `company_id`
- `pdf_url`
- `generated_at`

### `county_rules`
Fields:
- `id` (uuid)
- `county_name`
- `nitrogen_limit_per_1000sqft`
- `blackout_start`
- `blackout_end`
- `buffer_zone_ft`
- `slow_release_required`
- `created_at`

## Core API Endpoints
- `POST /api/company/create`
- `POST /api/auth/login`
- `POST /api/properties/create`
- `GET /api/properties`
- `POST /api/applications/create`
- `POST /api/compliance/check`
- `POST /api/reports/generate`
- `POST /api/crews/create`
- `GET /api/weather/check`
- `GET /api/properties/:id/nitrogen`

## Compliance Engine Logic
The compliance engine evaluates fertilizer applications against:
- nitrogen limits
- county fertilizer rules
- weather forecast
- water body proximity

Example checks:
- if rain forecast > threshold → return warning
- if nitrogen exceeds yearly limit → return violation risk
- if property inside blackout season → return restriction

## Core Features
- Property Management
- Fertilizer Application Logging
- Nitrogen Tracking
- Compliance Engine
- Compliance Report Generator
- Crew Activity Tracking
- Weather Risk Alerts

## Platform Goal
Provide landscaping companies with a simple way to document fertilizer applications and maintain records useful for internal tracking and regulatory inspections.

## Future Expansion
- Florida ordinance rule map
- automatic GPS job detection
- HOA reporting dashboards
- inspection audit logs
- statewide compliance database
