# Cloud Functions Deployment Guide

This guide explains how to deploy and manage the Firebase Cloud Functions for automated Firestore cleanup.

## Overview

The Defroster app now uses **Firebase Cloud Functions** for reliable, server-side cleanup of expired messages and old device registrations. This replaces the previous client-side cleanup scheduler.

### Functions Deployed:

1. **`cleanupExpiredMessages`** - Runs every 15 minutes
   - Deletes messages where `expiresAt <= now` (1 hour expiration)
   - Handles batching for large datasets (500 docs per batch)

2. **`cleanupOldDevices`** - Runs daily at 2:00 AM
   - Removes device registrations not updated in 30 days
   - Prevents stale device accumulation

3. **`manualCleanup`** - HTTP trigger for manual/emergency cleanup
   - Requires authentication via `CLEANUP_SECRET` env var
   - Useful for testing or emergency purges

## Prerequisites

1. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project** with:
   - Firestore database enabled
   - Billing account attached (Cloud Functions requires Blaze plan)
   - Cloud Scheduler API enabled (for scheduled functions)

3. **Authentication** - Login to Firebase:
   ```bash
   firebase login
   ```

## Project Structure

```
defroster-app/
├── firebase.json              # Firebase configuration
├── functions/
│   ├── src/
│   │   └── index.ts          # Cloud Functions code
│   ├── package.json          # Functions dependencies
│   ├── tsconfig.json         # TypeScript config
│   └── .gitignore           # Ignore node_modules, lib/
```

## Initial Setup

### 1. Select Your Firebase Project

```bash
firebase use --add
```

Select your project from the list and give it an alias (e.g., `production`).

### 2. Enable Required APIs

Go to [Google Cloud Console](https://console.cloud.google.com/) and enable:
- Cloud Functions API
- Cloud Scheduler API
- Cloud Build API

Or use `gcloud`:
```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Configure Environment Variables (Optional)

For the `manualCleanup` function, set a secret token:

```bash
firebase functions:secrets:set CLEANUP_SECRET
```

Enter a secure random string when prompted. This protects the manual cleanup endpoint.

## Deployment

### Build and Deploy All Functions

```bash
# Build TypeScript
cd functions
npm run build

# Deploy all functions
cd ..
firebase deploy --only functions
```

### Deploy Specific Functions

```bash
# Deploy only the scheduled cleanup
firebase deploy --only functions:cleanupExpiredMessages

# Deploy only the device cleanup
firebase deploy --only functions:cleanupOldDevices

# Deploy only manual cleanup
firebase deploy --only functions:manualCleanup
```

### First Deployment Notes

- First deployment can take 5-10 minutes
- Cloud Scheduler jobs are created automatically
- You'll see URLs for HTTP-triggered functions in the output

## Verification

### Check Function Deployment

```bash
firebase functions:list
```

Expected output:
```
┌───────────────────────────┬────────────────────┬─────────┐
│ Name                      │ Type               │ State   │
├───────────────────────────┼────────────────────┼─────────┤
│ cleanupExpiredMessages    │ scheduled (pubsub) │ ACTIVE  │
│ cleanupOldDevices         │ scheduled (pubsub) │ ACTIVE  │
│ manualCleanup             │ https              │ ACTIVE  │
└───────────────────────────┴────────────────────┴─────────┘
```

### View Function Logs

```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only cleanupExpiredMessages

# Live tail
firebase functions:log --only cleanupExpiredMessages --open
```

### Check Scheduled Jobs

Go to [Cloud Scheduler Console](https://console.cloud.google.com/cloudscheduler):
- Verify jobs are enabled
- Check schedule matches (every 15 minutes, daily at 2am)
- View execution history

## Testing

### Test Manual Cleanup Function

Get the function URL:
```bash
firebase functions:list | grep manualCleanup
```

Call it with authentication:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CLEANUP_SECRET" \
  https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/manualCleanup
```

Expected response:
```json
{
  "success": true,
  "messagesDeleted": 5,
  "timestamp": "2025-10-03T17:30:00.000Z"
}
```

### Test with Firebase Emulator (Local)

```bash
cd functions
npm run serve
```

This starts local emulators for functions, allowing you to test without deploying.

## Monitoring

### View Execution Metrics

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Functions section
3. Click on each function to see:
   - Invocations per day
   - Execution time
   - Memory usage
   - Error rate

### Set Up Alerts

Create alerts for function failures:

1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring)
2. Create Alert Policy
3. Select metric: `Cloud Function Execution Count`
4. Set condition: Error rate > 10%
5. Add notification channel (email, SMS, etc.)

## Cost Considerations

### Estimated Costs (at scale):

- **cleanupExpiredMessages**: 96 invocations/day (every 15 min)
  - ~3,000 invocations/month
  - Minimal compute (typically < 1 second)

- **cleanupOldDevices**: 1 invocation/day
  - ~30 invocations/month
  - Minimal compute

**Total estimated cost**: < $0.50/month (Free tier includes 2M invocations)

### Optimize Costs:

1. Use indexes for efficient queries (already configured)
2. Batch deletes (500 per batch - already implemented)
3. Monitor execution time - consider adjusting schedule if needed

## Troubleshooting

### Issue: "Cloud Scheduler API not enabled"

**Solution:**
```bash
gcloud services enable cloudscheduler.googleapis.com
```

### Issue: "Billing account not configured"

**Solution:**
Cloud Functions require the Blaze (pay-as-you-go) plan. Upgrade in Firebase Console:
1. Go to Settings > Usage and billing
2. Click "Modify plan"
3. Select Blaze plan

### Issue: "Permission denied" on deployment

**Solution:**
Ensure you have necessary permissions:
- Cloud Functions Developer
- Firebase Admin

Grant via IAM Console or ask project owner.

### Issue: Functions not running on schedule

**Solution:**
1. Check Cloud Scheduler jobs are enabled
2. Verify timezone is correct in function definition
3. Check function logs for errors
4. Manually trigger the job from Cloud Scheduler Console

### Issue: Timeout errors

**Solution:**
Increase timeout in function config:
```typescript
export const cleanupExpiredMessages = functions
  .runWith({ timeoutSeconds: 540 }) // 9 minutes max
  .pubsub
  .schedule('every 15 minutes')
  // ...
```

## Rollback

If you need to rollback to a previous version:

```bash
# List deployment history
firebase functions:list --json

# Deploy previous version
firebase deploy --only functions --force
```

## Updating Functions

1. Edit `functions/src/index.ts`
2. Build: `cd functions && npm run build`
3. Deploy: `firebase deploy --only functions`
4. Verify in logs: `firebase functions:log`

## Migration from Client-Side Cleanup

✅ **Already completed:**
- Client-side `cleanupScheduler` removed from `app/page.tsx`
- Firestore cleanup now handled by Cloud Functions
- Local IndexedDB cleanup still runs client-side (necessary for offline support)

## Security Notes

1. **Firestore Security Rules**: Functions run with Admin SDK privileges, bypassing client rules
2. **Manual Cleanup Endpoint**: Protected by `CLEANUP_SECRET` - keep this secret secure
3. **Service Account**: Firebase automatically handles authentication for scheduled functions
4. **Rate Limiting**: Scheduled functions have built-in rate limits (96/day for 15-min schedule)

## Next Steps

After deploying Cloud Functions:

1. ✅ Remove old cleanup API endpoint: `/app/api/cleanup-messages/` (no longer needed)
2. ✅ Update `.env.local.example` with `CLEANUP_SECRET` placeholder
3. Monitor function logs for first 24 hours to ensure proper operation
4. Set up alerting for production monitoring

## Resources

- [Firebase Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Scheduler Docs](https://cloud.google.com/scheduler/docs)
- [Firestore Batch Operations](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Function Monitoring](https://firebase.google.com/docs/functions/monitoring)
