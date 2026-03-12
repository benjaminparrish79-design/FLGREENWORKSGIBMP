# FL-GreenGuard: Supabase Integration Guide

## Overview

This guide explains how the FL-GreenGuard app integrates with Supabase for cloud synchronization, authentication, and data persistence.

## Architecture

The app uses a hybrid architecture combining local-first storage with cloud sync:

**Local Storage:** AsyncStorage stores audit logs, certificates, and user data locally for offline functionality. This ensures the app works without internet connectivity.

**Cloud Sync:** When online, the app syncs pending data to Supabase. The sync service includes retry logic with exponential backoff to handle network failures gracefully.

**Database:** Drizzle ORM manages the local MySQL/PostgreSQL schema, while Supabase provides the cloud backend with PostgreSQL.

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```
EXPO_PUBLIC_SUPABASE_URL=https://gpfbgllazvxykxoqgopz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:password@db.gpfbgllazvxykxoqgopz.supabase.co:5432/postgres
EXPO_PUBLIC_REVENUECAT_KEY=your_revenuecat_key
```

**Important:** Never commit `.env.local` to version control. Add it to `.gitignore`.

## Supabase Tables

The following tables need to be created in your Supabase database:

### audit_logs

Stores fertilizer application records with compliance information.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  gps_accuracy_meters DECIMAL(8, 2),
  wind_speed_mph DECIMAL(5, 2),
  temperature_f DECIMAL(5, 2),
  nitrogen_applied_lbs DECIMAL(10, 4) NOT NULL,
  distance_to_water_feet INT,
  is_compliant BOOLEAN NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_job_id ON audit_logs(job_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### users

Stores user profile information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  license_number VARCHAR(255),
  company_name VARCHAR(255),
  phone_number VARCHAR(20),
  subscription_status VARCHAR(50) DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### certificates

Stores uploaded certificates and licenses.

```sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  certificate_type VARCHAR(50) NOT NULL,
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  expiration_date DATE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_certificates_user_id ON certificates(user_id);
```

## Sync Service

The audit log sync service (`lib/audit-log-service.ts`) handles all cloud synchronization.

### Key Functions

**createAuditLog()** - Creates a new audit log entry locally and adds it to the pending sync queue.

```typescript
const auditLog = await createAuditLog({
  job_id: 'job_123',
  timestamp: new Date().toISOString(),
  latitude: 28.2949,
  longitude: -81.7603,
  nitrogen_applied_lbs: 2.5,
  distance_to_water_feet: 150,
  is_compliant: true,
});
```

**syncPendingLogs()** - Syncs all pending logs to Supabase with retry logic.

```typescript
const { synced, failed } = await syncPendingLogs(userId);
console.log(`Synced: ${synced}, Failed: ${failed}`);
```

**getSyncStatus()** - Returns the current sync status.

```typescript
const { pending, synced } = await getSyncStatus();
```

### Retry Logic

The sync service implements exponential backoff for failed syncs:

- Attempt 1: Immediate
- Attempt 2: Wait 1 second
- Attempt 3: Wait 2 seconds
- Attempt 4: Wait 4 seconds (max 3 retries by default)

Failed syncs are logged but don't block the app. Users can manually trigger sync by pulling down to refresh.

## UI Integration

### Home Screen

The home screen displays real-time compliance statistics:

- Total applications
- Compliant applications
- Compliance rate percentage
- Pending sync count

Data is refreshed every 10 seconds and whenever the user navigates to the screen.

### Calculator Screen

The calculator now includes a "Save Compliant Job" button that:

1. Gets the device's current GPS location
2. Creates an audit log entry with the calculation results
3. Saves the entry locally
4. Adds it to the pending sync queue
5. Shows a success alert with options to view logs or start a new job

### Audit Logs Screen

The audit logs screen displays:

- All local audit logs sorted by date (newest first)
- Compliance summary statistics
- Pending sync count with visual indicator
- Individual log details including GPS, weather, and compliance status

## Error Handling

The sync service includes comprehensive error handling:

**Network Errors** - Automatically retried with exponential backoff.

**Validation Errors** - Invalid data is logged and skipped to prevent sync loops.

**Schema Mismatches** - Type validation ensures data matches the Supabase schema.

**Rate Limiting** - Respects Supabase rate limits and backs off appropriately.

## Testing

### Local Testing

1. Start the app in development mode
2. Create a new audit log via the calculator
3. Verify it appears in the audit logs screen
4. Check AsyncStorage to confirm local storage
5. Go online and verify sync to Supabase

### Offline Testing

1. Disable network connectivity
2. Create multiple audit logs
3. Verify they're stored locally
4. Re-enable network
5. Verify sync completes successfully

### Supabase Console Testing

1. Log into your Supabase project
2. Navigate to the SQL Editor
3. Query the audit_logs table to verify synced data
4. Check for any errors in the logs

## Production Deployment

### Pre-Deployment Checklist

- [ ] Supabase project created and configured
- [ ] All required tables created with proper indexes
- [ ] Row-level security (RLS) policies configured
- [ ] Environment variables set in production
- [ ] Backup strategy configured
- [ ] Monitoring and alerting set up

### Row-Level Security (RLS)

Enable RLS on all tables to ensure users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own logs
CREATE POLICY "Users can view their own logs"
  ON audit_logs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Create policy for users to insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);
```

### Monitoring

Set up monitoring for:

- Sync failure rates
- Average sync time
- Pending log queue size
- Database query performance
- API rate limit usage

## Troubleshooting

### Logs Not Syncing

1. Check `.env.local` for correct Supabase URL and keys
2. Verify network connectivity
3. Check Supabase project status
4. Review sync logs in console
5. Verify table schema matches expected structure

### Data Inconsistencies

1. Check for schema mismatches
2. Verify RLS policies
3. Review sync error logs
4. Compare local and cloud data
5. Re-sync if necessary

### Performance Issues

1. Check Supabase query performance
2. Verify indexes are created
3. Monitor API rate limits
4. Consider pagination for large datasets
5. Optimize local storage queries

## Future Improvements

- Implement real-time sync using Supabase subscriptions
- Add data compression for large sync payloads
- Implement conflict resolution for concurrent edits
- Add analytics and usage tracking
- Implement backup and restore functionality
- Add data export capabilities

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [Expo Location API](https://docs.expo.dev/versions/latest/sdk/location/)
