# Deployment Guide

This guide covers deploying Defroster to production, including Next.js API routes, Firebase Cloud Functions, and security configuration.

## Overview

Defroster's production deployment includes:

1. **Next.js API Routes** (Vercel) - Serverless API endpoints for send/get/register operations
2. **Firebase Cloud Functions** - Scheduled periodic notifications and cleanup jobs
3. **Upstash Redis** - Distributed rate limiting across serverless instances
4. **Firestore Database** - Message and device storage with 24-hour retention
5. **Security Middleware** - Origin validation (BFF pattern) and timing-safe authentication
6. **Environment Validation** - Startup checks for required configuration
7. **Vercel Cron** - Scheduled cleanup via `/api/cleanup-messages`

## Prerequisites

1. **Node.js 20+** and npm
2. **Vercel Account** - https://vercel.com (free tier available)
3. **Firebase Project** - https://console.firebase.google.com
   - Firestore database created
   - Cloud Messaging enabled
   - VAPID key generated
4. **Firebase CLI** - `npm install -g firebase-tools`
5. **Upstash Redis** (required for production) - https://console.upstash.com
   - Free tier: 10,000 commands/day
   - Required for distributed rate limiting in serverless environments

## Deployment Steps

## Deployment to Vercel

### Step 1: Upstash Redis Setup

**Why Required**: Serverless functions don't share memory. Without distributed rate limiting, attackers can bypass limits by hitting different function instances.

1. Go to https://console.upstash.com/
2. Create account (free tier available)
3. Click **Create Database**
4. Choose a region close to your Vercel deployment
5. Copy credentials:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2: Generate Secrets

Generate a secure CRON secret (at least 32 characters):

```bash
# Generate 64-character hex secret
openssl rand -hex 32
```

### Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

**Firebase Client Configuration** (Public - from Firebase Console):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BN4bX...
```

**Base URL** (Public - must match your domain exactly):
```env
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

**Security Secrets** (Secret - never exposed to client):
```env
CRON_SECRET=<from step 2>
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

**Upstash Redis** (Secret):
```env
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYg...
```

**Important Notes**:
- ✅ `NEXT_PUBLIC_*` variables are safe to expose (embedded in client bundle)
- ⚠️ Server-only variables must be marked as "Secret" in Vercel
- ⚠️ `NEXT_PUBLIC_BASE_URL` must exactly match your production domain
- ⚠️ `CRON_SECRET` should be at least 32 characters

### Step 4: Deploy to Vercel

**Option A: GitHub Integration (Recommended)**

1. Push code to GitHub repository
2. Go to Vercel Dashboard → Add New Project
3. Import your GitHub repository
4. Vercel auto-detects Next.js configuration
5. Add environment variables (from Step 3)
6. Click **Deploy**

**Option B: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 5: Configure Vercel Cron

The `/api/cleanup-messages` endpoint runs hourly to delete expired messages.

In `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cleanup-messages",
    "schedule": "0 * * * *",
    "headers": {
      "authorization": "Bearer $CRON_SECRET"
    }
  }]
}
```

**Note**: Vercel Cron is available on Pro plan or via Vercel CLI deployment.

### Step 6: Deploy Firestore Security Rules

Deploy security rules to prevent client-side data manipulation:

```bash
firebase deploy --only firestore:rules
```

This deploys the `firestore.rules` file which enforces:
- ✅ Messages: Public read, server-write only
- ✅ Devices: No client access (Admin SDK only)
- ✅ Notifications: No client access

### Step 7: Deploy Firestore Indexes

Create composite indexes for efficient queries:

```bash
firebase deploy --only firestore:indexes
```

**Note**: Index creation can take 5-10 minutes. Monitor progress in Firebase Console.

### Step 8: Deploy Firebase Cloud Functions (Optional)

If using periodic notifications:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

This deploys:
- `sendPeriodicNotifications` - Runs every 15 minutes
- `cleanupExpiredMessages` - Runs every 15 minutes
- `cleanupExpiredNotifications` - Runs hourly
- `cleanupOldDevices` - Runs daily at 2 AM

### Step 9: Verify Deployment

**Check Vercel**:
1. Go to Vercel Dashboard → Your Project
2. Visit deployment URL
3. Check **Functions** tab for API routes
4. Check **Environment Variables** tab

**Check Firebase**:
1. Go to Firebase Console → Firestore
2. Verify indexes are built (green checkmarks)
3. Go to Functions section (if deployed)
4. Check logs for any errors

**Test Security**:
```bash
# Should succeed (from your domain)
curl -X POST https://your-domain.com/api/send-message \
  -H "Origin: https://your-domain.com" \
  -H "Content-Type: application/json" \
  -d '{"sightingType":"ICE","location":{"latitude":41.8781,"longitude":-87.6298}}'

# Should fail (unauthorized origin)
curl -X POST https://your-domain.com/api/send-message \
  -H "Origin: https://evil-site.com" \
  -d '{"sightingType":"ICE","location":{"latitude":41.8781,"longitude":-87.6298}}'
```

**Test Rate Limiting**:
```bash
# Send 6 requests rapidly (limit is 5/min)
for i in {1..6}; do
  curl -X POST https://your-domain.com/api/send-message \
    -H "Origin: https://your-domain.com" \
    -H "Content-Type: application/json" \
    -d '{"sightingType":"ICE","location":{"latitude":41.8781,"longitude":-87.6298}}'
done
# 6th request should return 429 Too Many Requests
```

## Security Architecture

### BFF Pattern (Backend-for-Frontend)

Defroster uses origin validation instead of exposed API keys:

**Why?**
- ❌ API keys in client code can be extracted
- ✅ Origin validation uses browser security features
- ✅ No secrets exposed in client bundle
- ✅ CORS provides additional protection

**Implementation**:
```typescript
// lib/middleware/auth.ts
export function validateOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL;

  if (origin !== allowedOrigin) {
    return NextResponse.json({ error: 'Unauthorized origin' }, { status: 403 });
  }
  return null;
}
```

### Distributed Rate Limiting

**Why Upstash Redis?**
- Vercel functions are stateless and distributed
- Each request may hit a different serverless instance
- In-memory rate limiting doesn't work across instances
- Redis provides shared state for all instances

**Flow**:
```
Request → Origin Check → Rate Limit Check → Process
                 ↓              ↓
              (Redis)      (Upstash)
```

**Rate Limits**:
- Send message: 5/min
- Register device: 3/min
- Get messages: 20/min
- Cleanup: 1/5min

### Timing-Safe Authentication

CRON secret uses constant-time comparison to prevent timing attacks:

```typescript
import { timingSafeEqual } from 'crypto';

// ❌ Vulnerable: token === secret (timing attack)
// ✅ Safe: timingSafeEqual(tokenBuffer, secretBuffer)
```

## How It Works

### Notification Flow

1. **User creates a sighting** → Immediate notifications sent to nearby devices via `/api/send-message`
2. **Optional: Periodic notifications** (if Cloud Functions deployed):
   - Runs every 15 minutes
   - Finds messages created in last 30 minutes
   - Notifies devices that moved into range
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

## Cost Estimates (1000 active users)

**Vercel (Next.js API Routes):**
- Free tier: 100GB bandwidth, 100GB-hours compute
- Pro tier: $20/month (if needed)

**Firebase (Firestore + FCM):**
- Reads: ~5.0M/month = ~$18/month
- Writes: ~1.9M/month = ~$3.50/month
- Cloud Functions (optional): Free tier covers it
- **Total: ~$21.50/month**

**Upstash Redis:**
- Free tier: 10,000 commands/day (300K/month)
- Covers most small-medium deployments
- Pro tier: $10/month for 1M commands

**Total Monthly Cost:**
- Small scale (< 1K users): **$0-20** (free tiers)
- Medium scale (1K-10K users): **$20-50**
- Large scale (10K+ users): **$50-200+**

**Cost Comparison (1000 users)**:
- Original (1-hour retention): $67/month
- With 7-day retention (naive): $9,627/month
- **Optimized (24-hour + incremental + Upstash)**: $21.50/month ✅

**Savings: 68% vs original, 99.8% vs naive 7-day**

## Optimization Tips

To reduce costs and improve performance:

1. **Increase polling interval** - Change from 15 min to 30 min (halves cost)
2. **Reduce notification radius** - Smaller radius = fewer devices to check
3. **Use CDN** - Vercel automatically caches static assets
4. **Enable incremental queries** - Already implemented (tracks last fetch time)
5. **Monitor Upstash usage** - Free tier may be sufficient for most deployments
6. **Firestore indexes** - Ensure all indexes are created for fast queries

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

### Deployment Fails

**Environment Validation Errors**:
```
❌ Environment validation failed:
   - Missing required environment variable: UPSTASH_REDIS_REST_URL
```

**Solution**: Add all required environment variables in Vercel Dashboard

### API Returns 403 Forbidden

**Cause**: Origin validation failed

**Check**:
1. `NEXT_PUBLIC_BASE_URL` matches your domain exactly
2. Request includes `Origin` header
3. No trailing slash in `NEXT_PUBLIC_BASE_URL`

### Rate Limiting Not Working

**Symptoms**: No 429 errors even after many requests

**Cause**: Upstash Redis not configured

**Check**:
1. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
2. Check Vercel logs for "⚠️  Upstash Redis not configured" warnings
3. Test Redis connection in Upstash Console

### CRON Job Fails

**Symptoms**: Messages not being cleaned up

**Check**:
1. Verify `CRON_SECRET` environment variable is set
2. Check Vercel Cron configuration in `vercel.json`
3. Verify Vercel Cron is enabled (Pro plan or CLI deployment)
4. Check Vercel logs for authentication errors

### Firestore Query Slow

**Cause**: Missing composite indexes

**Solution**:
```bash
firebase deploy --only firestore:indexes
```

Wait 5-10 minutes for indexes to build. Monitor in Firebase Console.

### High Firestore Costs

**Monitor usage**:
1. Go to Firebase Console → Usage and billing
2. Check read/write counts
3. Verify cleanup functions are running
4. Check client-side incremental queries are working

**Reduce costs**:
- Increase cleanup frequency
- Reduce message retention (currently 24 hours)
- Optimize geohash precision (currently 7 chars)
- Enable client-side caching (already implemented)

## Rollback

### Revert Vercel Deployment

```bash
# List deployments
vercel list

# Rollback to previous deployment
vercel rollback <deployment-url>
```

### Disable Cloud Functions

```bash
# Delete specific function
firebase functions:delete sendPeriodicNotifications

# Delete all functions
firebase functions:delete --force
```

### Disable Vercel Cron

Remove or comment out the `crons` section in `vercel.json` and redeploy.

## Monitoring

### Vercel Logs

View real-time logs:
```bash
vercel logs <deployment-url>
```

Or in Vercel Dashboard → Your Project → Logs

**What to monitor**:
- API response times (should be < 1s)
- 429 errors (rate limiting working)
- 403 errors (origin validation failures - investigate)
- 500 errors (server errors - investigate immediately)

### Firebase Console

**Firestore**:
- Usage & Billing → Monitor read/write counts
- Check for quota warnings

**Cloud Functions** (if deployed):
- View execution counts
- Check error rates
- Monitor cold start times

### Upstash Console

**Monitor**:
- Command usage (stay within free tier)
- Latency (should be < 50ms)
- Error rate

### Alerts Setup

**Vercel**:
- Set up error notifications in Dashboard → Settings → Notifications

**Firebase**:
- Budget alerts in Firebase Console → Usage and billing
- Set threshold at 80% of expected usage

**Upstash**:
- Email notifications for quota warnings

## Security Checklist

Before going live:

- [ ] All environment variables configured in Vercel
- [ ] `NEXT_PUBLIC_BASE_URL` matches production domain
- [ ] `CRON_SECRET` is at least 32 characters
- [ ] Upstash Redis configured and tested
- [ ] Firestore security rules deployed
- [ ] Firestore indexes created and built
- [ ] Origin validation tested (403 on wrong origin)
- [ ] Rate limiting tested (429 on excess requests)
- [ ] CRON job tested (cleanup working)
- [ ] SSL/HTTPS enabled (Vercel does this automatically)
- [ ] Test on real devices (PWA installation, notifications)

## Next Steps

After deployment:

1. **Monitor logs** for first 24 hours
2. **Test notifications** on multiple devices
3. **Verify cleanup** - Check Firestore for old messages after 24 hours
4. **Monitor costs** - Firebase billing dashboard
5. **Set up alerts** - Vercel, Firebase, Upstash
6. **Document** - Custom domain, environment variables
7. **Backup** - Export Firestore data regularly (Firebase Console → Firestore → Import/Export)
8. **Security** - Review logs for unauthorized access attempts
9. **Performance** - Monitor API response times
10. **Scale** - Adjust rate limits based on actual usage patterns
