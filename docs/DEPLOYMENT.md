# Deployment Guide for Periodic Notifications

This guide covers deploying the Cloud Function that sends periodic notifications to users who move into range of existing sightings.

## Overview

The optimized notification and caching system consists of:

1. **Cloud Function** (`sendPeriodicNotifications`) - Runs every 15 minutes, processes messages <30 min old
2. **Notification Tracking** - Records which devices have been notified
3. **Incremental Queries** - Client caches messages locally, only fetches new ones
4. **24-Hour Server Retention** - Messages stored for 1 day on server
5. **7-Day Client Cache** - Messages cached locally in IndexedDB for 1 week
6. **Cleanup Functions** - Removes expired records
7. **Firestore Indexes** - Optimizes queries for performance

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project initialized
- Firestore database created
- Firebase Admin SDK configured

## Deployment Steps

### 1. Install Function Dependencies

```bash
cd functions
npm install
```

### 2. Build Functions

```bash
npm run build
```

### 3. Deploy Firestore Indexes

This creates the necessary database indexes for efficient queries:

```bash
firebase deploy --only firestore:indexes
```

**Note:** Index creation can take several minutes. You can monitor progress in the Firebase Console.

### 4. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This deploys:
- `sendPeriodicNotifications` - Runs every 15 minutes
- `cleanupExpiredMessages` - Runs every 15 minutes
- `cleanupExpiredNotifications` - Runs every hour
- `cleanupOldDevices` - Runs daily at 2 AM

### 5. Verify Deployment

Check the Firebase Console:
1. Go to **Functions** section
2. Verify all functions are deployed successfully
3. Check the **Logs** tab for any errors

## How It Works

### Notification Flow

1. **User creates a sighting** → Immediate notifications sent to nearby devices
2. **Every 15 minutes:**
   - Cloud Function finds messages created in last 30 minutes (notification window)
   - For each message, finds devices within 5-mile radius
   - Filters out devices already notified
   - Sends push notifications to new devices
   - Records notifications to prevent duplicates

### Incremental Query Flow

1. **First visit to an area:**
   - Client queries server for all messages in 5-mile radius (last 24 hours)
   - Saves messages to IndexedDB
   - Records fetch timestamp for this geohash area

2. **Subsequent visits to same area:**
   - Client checks last fetch time for this geohash
   - Queries server only for messages since last fetch
   - Merges new messages with cached messages
   - Updates fetch timestamp

3. **Result:**
   - Fewer Firestore reads (only new messages)
   - Faster queries (smaller result sets)
   - Works offline (7-day cache)

### Database Collections

**messages**
- Stores sighting reports
- Retention: 24 hours (was 1 hour)
- Indexed by `timestamp`, `expiresAt` and `geohash`
- Composite index for `timestamp + expiresAt` (for notification window queries)

**devices**
- Stores user device registrations
- Updated when user location changes significantly (> 0.5 miles)
- Indexed by `geohash` and `updatedAt`
- Cleaned up after 7 days of inactivity

**notifications**
- Tracks which devices have been notified for each message
- Document ID: `{messageId}_{deviceId}`
- Auto-deleted after 2 hours
- Indexed by `expiresAt`

**Client-side (IndexedDB)**
- Messages cached for 7 days
- Metadata store tracks last fetch time per geohash area
- Enables incremental queries and offline access

### Cost Estimates (1000 active users)

**Optimized Architecture:**

**Cloud Functions:**
- Execution: Free tier covers it
- Invocations: 2,880/month (free tier covers 2M)

**Firestore:**
- Reads: ~5.0M/month = ~$18/month (71% reduction!)
- Writes: ~1.9M/month = ~$3.50/month
- **Total: ~$21.50/month**

**Cost Comparison:**
- Original (1-hour retention): $67/month
- With 7-day retention (naive): $9,627/month
- **Optimized (24-hour + incremental)**: $21.50/month ✅

**Savings: 68% vs original, 99.8% vs naive 7-day**

### Optimization Tips

To reduce costs:

1. **Increase polling interval** - Change from 15 min to 30 min (halves cost)
2. **Reduce notification radius** - Smaller radius = fewer devices to check
3. **Add caching** - Cache device lookups for repeated messages
4. **Batch operations** - Group notifications by geohash regions

## Testing

### Local Testing

Run functions locally with emulators:

```bash
cd functions
npm run serve
```

### Manual Trigger (for testing)

You can manually trigger the periodic notification function:

```bash
firebase functions:shell
> sendPeriodicNotifications()
```

### Monitor Logs

View real-time logs:

```bash
firebase functions:log --only sendPeriodicNotifications
```

## Troubleshooting

### Function Not Running

Check Cloud Scheduler in Google Cloud Console:
- Go to Cloud Scheduler
- Verify scheduled jobs exist
- Check job history for failures

### No Notifications Sent

Check logs for:
- "No active messages found" - No unexpired messages exist
- "No new devices to notify" - All nearby devices already notified
- FCM errors - Check token validity

### High Costs

Monitor Firestore usage:
- Check query counts in Firebase Console
- Review notification record cleanup (should run hourly)
- Consider increasing polling interval

## Rollback

To disable periodic notifications:

```bash
firebase functions:delete sendPeriodicNotifications
```

The app will continue working with instant notifications only (current behavior).

## Next Steps

After deployment:

1. Monitor logs for first few cycles
2. Check notification delivery on test devices
3. Verify cleanup functions remove old records
4. Monitor Firestore costs in billing dashboard
5. Adjust polling frequency based on usage patterns
