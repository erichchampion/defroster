# Defroster Cloud Functions

Firebase Cloud Functions for automated Firestore cleanup and maintenance.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Build
```bash
npm run build
```

### Deploy
```bash
cd ..
firebase deploy --only functions
```

## Functions

### 1. cleanupExpiredMessages
**Type**: Scheduled (every 15 minutes)
**Purpose**: Delete messages where `expiresAt <= now`

### 2. cleanupOldDevices
**Type**: Scheduled (daily at 2 AM)
**Purpose**: Remove device registrations inactive for 30+ days

### 3. manualCleanup
**Type**: HTTP trigger
**Purpose**: Manual cleanup endpoint (requires `CLEANUP_SECRET`)

## Development

### Watch Mode
```bash
npm run build:watch
```

### Local Emulator
```bash
npm run serve
```

### View Logs
```bash
npm run logs
```

## Deployment

See `../CLOUD_FUNCTIONS_DEPLOYMENT.md` for complete deployment guide.

## Dependencies

- `firebase-admin` - Firestore Admin SDK
- `firebase-functions` - Cloud Functions SDK
- `typescript` - TypeScript compiler
