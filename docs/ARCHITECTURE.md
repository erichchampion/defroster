# Defroster Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Design Principles](#core-design-principles)
4. [Data Flow](#data-flow)
5. [Component Architecture](#component-architecture)
6. [Abstraction Layers](#abstraction-layers)
7. [State Management](#state-management)
8. [Privacy & Security Architecture](#privacy--security-architecture)
9. [Database Schema](#database-schema)
10. [API Architecture](#api-architecture)
11. [Offline-First Strategy](#offline-first-strategy)
12. [Internationalization](#internationalization)
13. [Performance Optimizations](#performance-optimizations)
14. [Deployment Architecture](#deployment-architecture)

---

## Overview

Defroster is a Progressive Web Application (PWA) built with a **privacy-first**, **client-centric** architecture. The system enables anonymous, real-time community safety alerts through location-based messaging while maintaining complete user privacy.

### Key Architectural Goals

1. **Privacy by Design**: No personal data collection, anonymous reporting
2. **Offline-First**: Full functionality without network connectivity
3. **Real-Time Updates**: Instant notifications for nearby events
4. **Scalability**: Support from 10 to 100,000+ users
5. **Modularity**: Easy provider switching via abstraction layers
6. **Accessibility**: Multilingual, mobile-optimized, PWA-installable

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser/PWA)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   React UI   │  │  Service     │  │  IndexedDB   │         │
│  │  Components  │  │   Worker     │  │   Cache      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│          │                 │                  │                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │            React Hooks & Context Providers       │          │
│  └──────────────────────────────────────────────────┘          │
│          │                                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │          Abstraction Layer (Interfaces)          │          │
│  │  • IMessagingService  • IDataService            │          │
│  │  • IStorageService                               │          │
│  └──────────────────────────────────────────────────┘          │
│          │                                                       │
│  ┌──────────────────────────────────────────────────┐          │
│  │        Concrete Implementations                   │          │
│  │  • FCMMessagingService  • FirestoreDataService   │          │
│  │  • IndexedDBStorageService                       │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                        │ HTTPS
                        │
┌────────────────────────┴─────────────────────────────────────────┐
│                    Next.js API Routes (Edge/Serverless)          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /api/send-message      /api/get-messages                       │
│  /api/register-device   /api/cleanup-messages                   │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Firestore  │ │ Firebase FCM │ │   Firebase   │
│   Database   │ │   Messaging  │ │   Admin SDK  │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Maps**: Leaflet + React-Leaflet
- **State**: React Context API + Custom Hooks

#### Backend
- **Runtime**: Next.js API Routes (Node.js 20+)
- **Database**: Firebase Firestore
- **Push Notifications**: Firebase Cloud Messaging
- **Geospatial**: geofire-common
- **Admin Operations**: Firebase Admin SDK

#### Infrastructure
- **Hosting**: Vercel / Firebase Hosting / Self-hosted
- **CDN**: Vercel Edge Network / Cloudflare
- **Functions**: Serverless (Vercel Functions / Firebase Cloud Functions)
- **Storage**: IndexedDB (client-side)

---

## Core Design Principles

### 1. Privacy by Design

**Principle**: Minimize data collection; maximize anonymity.

**Implementation**:
- No user authentication or accounts
- Anonymous device IDs (UUID v4) instead of user identifiers
- Location randomized to 7-character geohash (~76m precision)
- No sender location tracking (only sighting location)
- Auto-deletion: 1 hour server-side, 1 week client-side
- No analytics or tracking scripts

**Code Example**:
```typescript
// lib/utils/geohash.ts
export function randomizeLocation(location: GeoLocation): GeoLocation {
  const geohash = geohashForLocation([location.latitude, location.longitude], 7);
  const bounds = geohashQueryBounds([location.latitude, location.longitude], 1);
  // Returns center of geohash cell, not exact location
  return {
    latitude: parseFloat(bounds[0][0].toFixed(4)),
    longitude: parseFloat(bounds[0][1].toFixed(4))
  };
}
```

### 2. Abstraction Over Implementation

**Principle**: Depend on interfaces, not concrete implementations.

**Benefits**:
- Easy provider switching (Firebase → MongoDB, FCM → OneSignal)
- Testability (mock implementations)
- Future-proofing (swap backends without touching UI)

**Code Example**:
```typescript
// lib/abstractions/messaging-service.ts
export interface IMessagingService {
  initialize(): Promise<void>;
  requestPermission(): Promise<boolean>;
  getToken(): Promise<string | null>;
  sendToDevices(tokens: string[], message: Message): Promise<void>;
  onMessage(callback: (message: Message) => void): void;
}

// Swap implementations by changing one import
import { FCMMessagingService } from '@/lib/services/fcm-messaging-service';
// import { OneSignalMessagingService } from '@/lib/services/onesignal-messaging-service';

const messagingService = new FCMMessagingService();
```

### 3. Offline-First

**Principle**: App should work without network connectivity.

**Implementation**:
- IndexedDB for message caching
- Service Worker for offline page serving
- Optimistic UI updates
- Background sync when connection returns

**Code Flow**:
```
User Action (Send Message)
    ↓
Save to IndexedDB (Instant UI Update)
    ↓
Send to Server (Background)
    ↓ [if offline]
Queue for Later (Service Worker)
    ↓ [when online]
Retry Queued Operations
```

### 4. Client-First Architecture

**Principle**: Client owns the data; server is ephemeral storage.

**Rationale**:
- Privacy: Server doesn't retain long-term user data
- Performance: Instant reads from local cache
- Offline: No dependency on server for viewing data

**Data Lifecycle**:
```
Message Created
    ├─> Saved to IndexedDB (permanent until 1 week)
    └─> Sent to Firestore (deleted after 1 hour)
```

---

## Data Flow

### 1. User Creates Sighting Report

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User taps "Report Sighting" (ICE/Army/Police)            │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. MessageForm Component                                      │
│    - Validates input                                          │
│    - Calls onSendMessage handler                              │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. useMessaging Hook                                          │
│    - Generates message ID (UUID v4)                           │
│    - Creates message object with geohash                      │
│    - Saves to IndexedDB (instant UI update)                   │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. API Call: POST /api/send-message                           │
│    {                                                           │
│      sightingType: "ICE",                                     │
│      location: { lat: 41.xxxx, lng: -87.xxxx },              │
│      deviceId: "550e8400-e29b-41d4-a716-446655440000"        │
│    }                                                           │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. API Route Handler                                          │
│    - Validates API key                                        │
│    - Generates geohash from location                          │
│    - Creates message document                                 │
│    - Saves to Firestore                                       │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. Find Nearby Devices                                        │
│    - Query Firestore devices collection                       │
│    - Filter by geohash bounds (5-mile radius)                 │
│    - Exclude sender's device                                  │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ 7. Send Push Notifications                                    │
│    - Firebase Admin SDK sends FCM messages                    │
│    - Payload includes message data                            │
│    - Notifications sent to device tokens                      │
└──────────────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────────────┐
│ 8. Nearby Devices Receive                                     │
│    - Service Worker receives FCM message                      │
│    - Shows browser notification                               │
│    - Updates IndexedDB cache                                  │
│    - Triggers UI refresh                                      │
└──────────────────────────────────────────────────────────────┘
```

### 2. User Views Sightings

```
Page Load / Refresh
        ↓
┌──────────────────────────────────────┐
│ 1. useMessaging.getMessages()       │
│    - Reads from IndexedDB cache     │
│    - Displays cached data instantly │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 2. Background: Fetch from Server     │
│    - POST /api/get-messages          │
│    - Query Firestore by geohash      │
│    - Filter by radius                │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ 3. Merge & Update                    │
│    - Merge server data with cache    │
│    - Update IndexedDB                │
│    - Trigger UI re-render            │
└──────────────────────────────────────┘
```

### 3. Automatic Cleanup

```
Hourly Cron Job (Vercel/Cloud Functions)
        ↓
┌──────────────────────────────────────┐
│ POST /api/cleanup-messages           │
│ Header: x-cron-secret: <secret>      │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│ Query Firestore:                     │
│   expiresAt < Date.now()             │
│ Delete expired messages              │
└──────────────────────────────────────┘

Client-Side Cleanup (Every 15 minutes)
        ↓
┌──────────────────────────────────────┐
│ useMessaging.cleanupExpiredMessages()│
│ - Query IndexedDB by expiresAt       │
│ - Delete expired entries             │
└──────────────────────────────────────┘

Client-Side Old Message Cleanup (Daily)
        ↓
┌──────────────────────────────────────┐
│ useMessaging.cleanupOldMessages()    │
│ - Delete messages older than 1 week  │
└──────────────────────────────────────┘
```

---

## Component Architecture

### Component Hierarchy

```
App (page.tsx)
├── I18nProvider
│   └── ServicesProvider
│       ├── LocationPermission (if no permission)
│       │   ├── Story Card
│       │   ├── Permission Request
│       │   └── Privacy Notice
│       │
│       └── Main App (if permission granted)
│           ├── Header
│           │   ├── Title
│           │   ├── Status Indicators
│           │   └── Notification Toggle
│           │
│           ├── SightingMap
│           │   ├── MapContainer (Leaflet)
│           │   ├── User Location Marker
│           │   ├── Radius Circle
│           │   └── Sighting Markers (with age-based opacity)
│           │
│           ├── MessageForm
│           │   ├── Sighting Type Selector (Radio)
│           │   ├── Current Location Display
│           │   └── Submit Button
│           │
│           └── MessageList
│               └── Message Cards
│                   ├── Sighting Badge
│                   ├── Timestamp
│                   ├── Location
│                   └── Distance Indicator
```

### Key Components

#### 1. LocationPermission (`app/components/LocationPermission.tsx`)

**Purpose**: Request location access and display app mission.

**Props**:
```typescript
interface LocationPermissionProps {
  onRequestPermission: () => Promise<{ latitude: number; longitude: number } | null>;
}
```

**State**:
- `loading: boolean` - Permission request in progress
- `error: string | null` - Error message if permission denied

**Features**:
- Mission statement (Chicago raid story)
- Privacy notice
- Loading states
- Error handling

#### 2. SightingMap (`app/components/SightingMap.tsx`)

**Purpose**: Display interactive map with sightings.

**Props**:
```typescript
interface SightingMapProps {
  messages: Message[];
  currentLocation: GeoLocation;
}
```

**Features**:
- Custom markers with emojis (🚔 ICE, 🪖 Army, 👮 Police)
- Age-based opacity (fades over 7 days)
- Radius circle visualization
- Popup with sighting details
- Auto-recentering on location change

**Key Functions**:
```typescript
// Calculate opacity based on age
const getOpacityForAge = (timestamp: number): number => {
  const ageInDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  if (ageInDays < 3) return 1.0;
  if (ageInDays < 4) return 0.9;
  // ... fades to 50% at 7 days
  return 0.5;
};
```

#### 3. MessageForm (`app/components/MessageForm.tsx`)

**Purpose**: Create new sighting reports.

**Props**:
```typescript
interface MessageFormProps {
  onSendMessage: (
    sightingType: SightingType,
    location: GeoLocation
  ) => Promise<void>;
  currentLocation: GeoLocation;
}
```

**State**:
- `sightingType: 'ICE' | 'Army' | 'Police'` - Selected type
- `loading: boolean` - Submit in progress

**Validation**:
- Location must be valid (lat/lng in range)
- Sighting type must be selected

#### 4. MessageList (`app/components/MessageList.tsx`)

**Purpose**: Display list of nearby sightings.

**Props**:
```typescript
interface MessageListProps {
  messages: Message[];
}
```

**Features**:
- Empty state with encouragement
- Relative timestamps (i18n)
- Color-coded badges
- Distance indicator

---

## Abstraction Layers

### Overview

Abstraction layers enable provider independence. Each service has an **interface** (contract) and **concrete implementations**.

### 1. IMessagingService

**Location**: `lib/abstractions/messaging-service.ts`

**Purpose**: Push notification abstraction.

**Interface**:
```typescript
export interface IMessagingService {
  initialize(): Promise<void>;
  requestPermission(): Promise<boolean>;
  getToken(): Promise<string | null>;
  sendToDevices(tokens: string[], message: Message): Promise<void>;
  onMessage(callback: (message: Message) => void): void;
  offMessage(): void;
  onTokenRefresh(callback: (token: string) => void): void;
  refreshToken(): Promise<string | null>;
}
```

**Current Implementation**: `FCMMessagingService`

**Alternative Providers**:
- OneSignal
- Pusher Beams
- Custom WebSocket
- APNS (iOS native)
- Native Android Push

### 2. IDataService

**Location**: `lib/abstractions/data-service.ts`

**Purpose**: Database abstraction.

**Interface**:
```typescript
export interface IDataService {
  // Messages
  saveMessage(message: Message): Promise<void>;
  getNearbyMessages(location: GeoLocation, radiusMiles: number): Promise<Message[]>;
  deleteExpiredMessages(): Promise<number>;

  // Devices
  saveDevice(device: UserDevice): Promise<void>;
  getNearbyDevices(location: GeoLocation, radiusMiles: number): Promise<UserDevice[]>;
  deleteOldDevices(cutoffDate: Date): Promise<number>;
}
```

**Current Implementation**: `FirestoreDataService`

**Alternative Providers**:
- MongoDB (with geospatial indexes)
- PostgreSQL + PostGIS
- MySQL + Spatial Extensions
- Supabase
- CockroachDB

**Migration Example**:
```typescript
// Before (Firestore)
const dataService = new FirestoreDataService();

// After (MongoDB)
const dataService = new MongoDBDataService({
  connectionString: process.env.MONGODB_URI
});

// No changes needed in components!
```

### 3. IStorageService

**Location**: `lib/abstractions/storage-service.ts`

**Purpose**: Local storage abstraction.

**Interface**:
```typescript
export interface IStorageService {
  initialize(): Promise<void>;
  saveMessage(message: Message): Promise<void>;
  saveMessages(messages: Message[]): Promise<void>;
  getAllMessages(): Promise<Message[]>;
  deleteExpiredMessages(): Promise<number>;
  deleteOldMessages(cutoffDate: Date): Promise<number>;
  clearAll(): Promise<void>;
}
```

**Current Implementation**: `IndexedDBStorageService`

**Alternative Providers**:
- LocalStorage (simpler, size-limited)
- AsyncStorage (React Native)
- SQLite (Electron/Mobile)

---

## State Management

### Architecture: Context + Hooks (No Redux)

**Rationale**:
- Simplicity over complexity
- React Context sufficient for this scale
- Hooks provide clean data access
- No global state needed (mostly local/component state)

### Context Providers

#### 1. I18nProvider (`lib/contexts/I18nContext.tsx`)

**Purpose**: Internationalization state.

**Provided Values**:
```typescript
interface I18nContextType {
  language: Language;                  // Current language ('en' | 'es')
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;                  // Translation object
  formatString: (template: string, values: Record<string, string | number>) => string;
}
```

**Usage**:
```typescript
const { t, language, setLanguage } = useI18n();

return <h1>{t.app.name}</h1>; // "Defroster"
```

**Features**:
- Browser language detection
- LocalStorage persistence
- Dynamic translation loading

#### 2. ServicesProvider (`lib/contexts/ServicesContext.tsx`)

**Purpose**: Dependency injection for services.

**Provided Values**:
```typescript
interface ServicesContextType {
  messagingService: IMessagingService;
  dataService: IDataService;
  storageService: IStorageService;
}
```

**Usage**:
```typescript
const { messagingService } = useServices();
await messagingService.requestPermission();
```

**Benefits**:
- Single source of truth for service instances
- Easy mocking in tests
- Centralized initialization

### Custom Hooks

#### 1. useGeolocation (`app/hooks/useGeolocation.ts`)

**Purpose**: Manage geolocation state.

**Returns**:
```typescript
interface UseGeolocationReturn {
  location: GeoLocation | null;
  permissionGranted: boolean;
  error: string | null;
  requestPermission: () => Promise<GeoLocation | null>;
}
```

**Implementation Details**:
- Requests permission on demand
- Caches location in state
- Handles errors gracefully
- Re-requests if permission revoked

#### 2. useMessaging (`app/hooks/useMessaging.ts`)

**Purpose**: Manage messaging state and operations.

**Returns**:
```typescript
interface UseMessagingReturn {
  // State
  token: string | null;
  permission: NotificationPermission;
  messages: Message[];
  isOffline: boolean;

  // Operations
  requestPermission: () => Promise<string | null>;
  registerDevice: (location: GeoLocation) => Promise<void>;
  sendMessage: (sightingType: SightingType, location: GeoLocation, deviceLocation: GeoLocation) => Promise<void>;
  getMessages: (location: GeoLocation) => Promise<void>;
  setupMessageListener: () => () => void;
  cleanupExpiredMessages: () => Promise<void>;
  cleanupOldMessages: () => Promise<void>;
}
```

**Key Features**:
- Initializes messaging service
- Manages FCM token
- Handles message sending/receiving
- Orchestrates IndexedDB + Firestore
- Background cleanup

---

## Privacy & Security Architecture

### 1. Data Minimization

**Collected Data (Minimal)**:
```typescript
interface Message {
  id: string;              // UUID v4 (not tied to user)
  sightingType: 'ICE' | 'Army' | 'Police';
  location: GeoLocation;   // Sighting location (randomized)
  timestamp: number;       // Report time
  geohash: string;         // 7-char geohash (~76m precision)
  expiresAt: number;       // Auto-delete timestamp
}

interface UserDevice {
  deviceId: string;        // UUID v4 (not FCM token!)
  token: string;           // FCM token (for notifications only)
  geohash: string;         // Device location (7-char)
  updatedAt: number;       // Last update time
}
```

**NOT Collected**:
- ❌ User names, emails, phone numbers
- ❌ User accounts or authentication
- ❌ Sender location (only sighting location)
- ❌ IP addresses (server doesn't log)
- ❌ Device fingerprints
- ❌ Analytics or tracking cookies

### 2. Geohash Privacy

**Purpose**: Prevent exact location tracking.

**Implementation**:
```typescript
// lib/utils/geohash.ts
import { geohashForLocation } from 'geofire-common';

export function generateGeohash(location: GeoLocation): string {
  // 7 characters = ~76m x ~152m precision
  // Prevents pinpointing exact address
  return geohashForLocation(
    [location.latitude, location.longitude],
    7  // precision level
  );
}
```

**Precision Levels**:
| Chars | Cell Width  | Cell Height | Use Case |
|-------|-------------|-------------|----------|
| 5     | ±2.4 km    | ±2.4 km    | Too imprecise |
| 6     | ±610 m     | ±610 m     | Still too wide |
| **7** | **±76 m**  | **±152 m** | **✅ Chosen (city block)** |
| 8     | ±19 m      | ±19 m      | Too precise (house-level) |

### 3. Device Anonymity

**Device ID Generation**:
```typescript
// lib/utils/device-id.ts
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('defroster-device-id');

  if (!deviceId) {
    // UUID v4: completely random, no machine info
    deviceId = crypto.randomUUID();
    localStorage.setItem('defroster-device-id', deviceId);
  }

  return deviceId;
}
```

**Why not use FCM token as ID?**
- FCM tokens can change (app reinstall, token refresh)
- FCM tokens are managed by Google
- Device ID persists across token refreshes
- Separates identity from delivery mechanism

### 4. Auto-Deletion

**Server-Side** (Firestore):
```typescript
// Message creation
const message = {
  // ...
  timestamp: Date.now(),
  expiresAt: Date.now() + (60 * 60 * 1000)  // 1 hour
};

// Cleanup (cron job)
const expiredMessages = await firestore
  .collection('messages')
  .where('expiresAt', '<', Date.now())
  .get();

await Promise.all(
  expiredMessages.docs.map(doc => doc.ref.delete())
);
```

**Client-Side** (IndexedDB):
```typescript
// 1 week retention
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
const cutoff = Date.now() - ONE_WEEK;

const tx = db.transaction('messages', 'readwrite');
const index = tx.objectStore('messages').index('timestamp');
const oldMessages = await index.openCursor(IDBKeyRange.upperBound(cutoff));

// Delete all older than 1 week
```

### 5. API Security

**Authentication**:
```typescript
// app/api/send-message/route.ts
export async function POST(request: Request) {
  // Validate API key
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Validate CORS
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  if (origin !== allowedOrigin && allowedOrigin !== '*') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Process request...
}
```

**Cron Job Protection**:
```typescript
// app/api/cleanup-messages/route.ts
const cronSecret = request.headers.get('x-cron-secret');
if (cronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 6. Firestore Security Rules

**Location**: `firestore.rules`

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Messages: Public read, server-write only
    match /messages/{messageId} {
      allow read: if true;  // Anyone can read
      allow write: if false; // Only Admin SDK can write
    }

    // Devices: No client access
    match /devices/{deviceId} {
      allow read: if false;  // Only Admin SDK
      allow write: if false; // Only Admin SDK
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Why server-write only?**
- Prevents spam/fake reports
- Validates data server-side
- Controls notification sending
- Enables abuse detection

---

## Database Schema

### Firestore Collections

#### 1. `messages` Collection

**Purpose**: Store sighting reports.

**Document Structure**:
```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // UUID v4
  sightingType: "ICE",                          // "ICE" | "Army" | "Police"
  location: {
    latitude: 41.8781,                          // Sighting lat
    longitude: -87.6298                         // Sighting lng
  },
  timestamp: 1696348800000,                     // Unix timestamp (ms)
  geohash: "dp3wjz9",                          // 7-char geohash
  expiresAt: 1696352400000                     // timestamp + 1 hour
}
```

**Indexes**:
```
Composite Index 1:
  - geohash (Ascending)
  - expiresAt (Ascending)
```

**Query Patterns**:
```typescript
// Get nearby messages
const bounds = geohashQueryBounds(center, radiusMeters);
const promises = bounds.map(([start, end]) => {
  return firestore
    .collection('messages')
    .where('geohash', '>=', start)
    .where('geohash', '<=', end)
    .where('expiresAt', '>', Date.now())
    .get();
});
```

#### 2. `devices` Collection

**Purpose**: Store device tokens for notifications.

**Document ID**: Device ID (UUID v4)

**Document Structure**:
```typescript
{
  deviceId: "7c9e6679-7425-40de-944b-e07fc1f90ae7", // UUID v4
  token: "fN7X...",                                  // FCM token
  geohash: "dp3wjz9",                               // Device location
  updatedAt: 1696348800000                          // Last update
}
```

**Indexes**:
```
Composite Index 1:
  - geohash (Ascending)
  - updatedAt (Ascending)
```

**Query Patterns**:
```typescript
// Find nearby devices for notifications
const bounds = geohashQueryBounds(center, radiusMeters);
const promises = bounds.map(([start, end]) => {
  return firestore
    .collection('devices')
    .where('geohash', '>=', start)
    .where('geohash', '<=', end)
    .get();
});
```

### IndexedDB Schema

**Database Name**: `DefrosterDB`

**Version**: 1

**Object Store**: `messages`

**Key Path**: `id`

**Indexes**:
```typescript
{
  timestamp: { unique: false },     // For time-based queries
  expiresAt: { unique: false },     // For cleanup
  sightingType: { unique: false }   // For filtering
}
```

**Schema Definition**:
```typescript
// lib/services/indexeddb-storage-service.ts
const request = indexedDB.open('DefrosterDB', 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;

  if (!db.objectStoreNames.contains('messages')) {
    const objectStore = db.createObjectStore('messages', {
      keyPath: 'id'
    });

    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
    objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
    objectStore.createIndex('sightingType', 'sightingType', { unique: false });
  }
};
```

---

## API Architecture

### Endpoint Overview

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/send-message` | POST | API Key | Create sighting report |
| `/api/get-messages` | POST | API Key | Fetch nearby sightings |
| `/api/register-device` | POST | API Key | Register for notifications |
| `/api/cleanup-messages` | POST | Cron Secret | Delete expired messages |

### 1. POST /api/send-message

**Purpose**: Create a new sighting report and notify nearby devices.

**Request**:
```typescript
{
  sightingType: "ICE" | "Army" | "Police",
  location: {
    latitude: number,
    longitude: number
  },
  deviceId: string  // UUID v4
}
```

**Headers**:
```
x-api-key: <API_SECRET_KEY>
Content-Type: application/json
```

**Response**:
```typescript
{
  success: true,
  messageId: "550e8400-e29b-41d4-a716-446655440000",
  notificationsSent: 23
}
```

**Process Flow**:
1. Validate API key
2. Validate input (lat/lng, sighting type)
3. Generate message ID (UUID)
4. Calculate geohash (7 chars)
5. Set expiration (now + 1 hour)
6. Save to Firestore
7. Find nearby devices (5-mile radius)
8. Send FCM notifications
9. Return success

**Error Handling**:
```typescript
try {
  // Process message
} catch {
  console.error('Error in send-message');
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### 2. POST /api/get-messages

**Purpose**: Retrieve sightings within radius.

**Request**:
```typescript
{
  location: {
    latitude: number,
    longitude: number
  }
}
```

**Response**:
```typescript
{
  messages: Message[]
}
```

**Process Flow**:
1. Validate API key
2. Calculate geohash bounds for 5-mile radius
3. Query Firestore with bounds
4. Filter out expired messages
5. Calculate actual distance (great circle)
6. Filter by exact radius
7. Return sorted by timestamp

**Geohash Query**:
```typescript
const bounds = geohashQueryBounds(
  [location.latitude, location.longitude],
  DEFAULT_RADIUS_METERS
);

// Multiple queries needed to cover circular area with geohash rectangles
const promises = bounds.map(([start, end]) => {
  return dataService.queryRange('messages', 'geohash', start, end);
});

const snapshots = await Promise.all(promises);
const messages = snapshots.flat();
```

### 3. POST /api/register-device

**Purpose**: Register device for push notifications.

**Request**:
```typescript
{
  token: string,      // FCM token
  deviceId: string,   // UUID v4
  location: {
    latitude: number,
    longitude: number
  }
}
```

**Response**:
```typescript
{
  success: true,
  deviceId: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

**Process Flow**:
1. Validate API key
2. Validate FCM token format
3. Validate device ID (UUID)
4. Calculate geohash
5. Upsert device document (deviceId as doc ID)
6. Set updatedAt timestamp
7. Return success

**Upsert Logic**:
```typescript
await firestore
  .collection('devices')
  .doc(deviceId)  // Use deviceId as document ID
  .set({
    deviceId,
    token,
    geohash,
    updatedAt: Date.now()
  }, { merge: true });  // Update if exists, create if not
```

### 4. POST /api/cleanup-messages

**Purpose**: Delete expired messages (cron job).

**Request**:
```typescript
// No body required
```

**Headers**:
```
x-cron-secret: <CRON_SECRET>
```

**Response**:
```typescript
{
  success: true,
  deletedCount: 47
}
```

**Process Flow**:
1. Validate cron secret
2. Query messages where `expiresAt < now`
3. Batch delete (max 500 per batch)
4. Return deleted count

**Scheduling** (Vercel Cron):
```json
{
  "crons": [{
    "path": "/api/cleanup-messages",
    "schedule": "0 * * * *",  // Hourly
    "headers": {
      "x-cron-secret": "$CRON_SECRET"
    }
  }]
}
```

---

## Offline-First Strategy

### Service Worker

**Location**: `public/firebase-messaging-sw.js`

**Responsibilities**:
1. Handle FCM background messages
2. Show notifications when app is closed
3. Cache app shell (optional enhancement)

**Background Message Handler**:
```javascript
// firebase-messaging-sw.js
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.data.sightingType + ' Sighting';
  const notificationOptions = {
    body: `Reported ${payload.data.timestamp}`,
    icon: '/appicon/defroster-192x192.png',
    badge: '/appicon/defroster-64x64.png',
    data: payload.data
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});
```

### IndexedDB Caching Strategy

**Write Pattern** (Optimistic UI):
```typescript
async function sendMessage(message: Message) {
  // 1. Save to IndexedDB first (instant UI update)
  await storageService.saveMessage(message);

  // 2. Update UI optimistically
  setMessages(prev => [...prev, message]);

  // 3. Send to server in background
  try {
    await fetch('/api/send-message', { /* ... */ });
  } catch (error) {
    // If offline, service worker will retry later
    console.error('Failed to send, will retry when online');
  }
}
```

**Read Pattern** (Cache-First):
```typescript
async function getMessages(location: GeoLocation) {
  // 1. Read from cache immediately
  const cachedMessages = await storageService.getAllMessages();
  setMessages(cachedMessages);

  // 2. Fetch from server in background
  try {
    const response = await fetch('/api/get-messages', { /* ... */ });
    const { messages: serverMessages } = await response.json();

    // 3. Merge and update cache
    await storageService.saveMessages(serverMessages);
    setMessages(serverMessages);
  } catch {
    // Offline: use cached data (already displayed)
    console.log('Offline - using cached data');
    setIsOffline(true);
  }
}
```

### Network Detection

**Implementation**:
```typescript
// app/hooks/useMessaging.ts
const [isOffline, setIsOffline] = useState(false);

useEffect(() => {
  const handleOnline = () => setIsOffline(false);
  const handleOffline = () => setIsOffline(true);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

**UI Indicator**:
```tsx
{isOffline && (
  <p className="text-sm text-amber-600">
    ⚠ Offline mode - viewing cached sightings
  </p>
)}
```

---

## Internationalization

### Architecture

**Strategy**: JSON-based translations with React Context.

**Files**:
```
lib/i18n/
├── en.json         # English translations
├── es.json         # Spanish translations
├── i18n.ts         # Utilities
└── I18nContext.tsx # React Context
```

### Translation Structure

**Example** (`lib/i18n/en.json`):
```json
{
  "app": {
    "name": "Defroster",
    "title": "Defroster - Report Sightings"
  },
  "messageForm": {
    "heading": "Report Sighting Type",
    "sightingTypes": {
      "ice": "ICE (Immigration and Customs Enforcement)",
      "army": "Army",
      "police": "Police"
    },
    "submitButton": "Report Sighting"
  },
  "time": {
    "minutesAgo": "{count} minutes ago",
    "hoursAgo": "{count} hours ago"
  }
}
```

### Language Detection

**Browser Language**:
```typescript
// lib/i18n/i18n.ts
export function getBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith('es')) return 'es';
  // Add more languages here

  return 'en'; // Default
}
```

### Usage in Components

**With Context**:
```typescript
import { useI18n } from '@/lib/contexts/I18nContext';

function MyComponent() {
  const { t } = useI18n();

  return (
    <h1>{t.app.name}</h1>
    <button>{t.messageForm.submitButton}</button>
  );
}
```

**With Placeholders**:
```typescript
const { t, formatString } = useI18n();

const text = formatString(t.time.minutesAgo, { count: 5 });
// Result: "5 minutes ago"
```

### Adding New Languages

1. Create `lib/i18n/fr.json` (copy structure from `en.json`)
2. Translate all strings
3. Add to `i18n.ts`:
```typescript
import fr from './fr.json';

const translations: Record<Language, TranslationKeys> = {
  en,
  es,
  fr  // Add here
};

export function getBrowserLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('fr')) return 'fr';  // Add detection
  return 'en';
}
```

---

## Performance Optimizations

### 1. Code Splitting

**Dynamic Imports**:
```typescript
// app/page.tsx
const SightingMap = dynamic(() => import('@/app/components/SightingMap'), {
  ssr: false  // Leaflet doesn't support SSR
});
```

**Benefits**:
- Map bundle only loads when needed
- Reduces initial page load
- Faster time to interactive

### 2. Memoization

**useMemo for Expensive Calculations**:
```typescript
// app/components/SightingMap.tsx
const center: [number, number] = useMemo(
  () => [currentLocation.latitude, currentLocation.longitude],
  [currentLocation]
);
```

**React.memo for Components**:
```typescript
export default React.memo(MessageList, (prev, next) => {
  return prev.messages.length === next.messages.length;
});
```

### 3. Debouncing

**Location Updates**:
```typescript
const debouncedUpdateLocation = useMemo(
  () => debounce((loc: GeoLocation) => {
    updateDeviceLocation(loc);
  }, 5000),  // Only update every 5 seconds
  []
);
```

### 4. IndexedDB Batch Operations

**Batch Writes**:
```typescript
async saveMessages(messages: Message[]): Promise<void> {
  const tx = this.db!.transaction(['messages'], 'readwrite');
  const store = tx.objectStore('messages');

  // Use transaction for batch writes
  messages.forEach(message => {
    store.put(message);
  });

  await tx.complete;
}
```

### 5. Geohash Query Optimization

**Minimize Query Rectangles**:
```typescript
// Instead of querying entire circle, use geohash bounds
const bounds = geohashQueryBounds(center, radius);

// Typically 2-4 rectangle queries cover a circular area
const promises = bounds.map(([start, end]) => {
  return queryRange('messages', 'geohash', start, end);
});
```

**Post-Filter for Accuracy**:
```typescript
// After geohash query, filter by exact distance
const filtered = messages.filter(message => {
  const distance = distanceBetween(
    [center.latitude, center.longitude],
    [message.location.latitude, message.location.longitude]
  );
  return distance <= radiusMeters;
});
```

### 6. Image Optimization

**PWA Icons**:
- Pre-generated all sizes (16x16 to 1024x1024)
- WebP format where supported
- Lazy loading for non-critical images

### 7. Bundle Size Optimization

**Current Size**:
```
Route (app)                    Size       First Load JS
┌ ○ /                       6.36 kB        188 kB
└ ○ /api/*                  131 B          103 kB

First Load JS shared        102 kB
```

**Techniques**:
- Tree shaking (automatically via Next.js)
- No moment.js (native Intl API instead)
- Minimal dependencies (no lodash, axios, etc.)

---

## Deployment Architecture

### Production Stack (Vercel)

```
┌─────────────────────────────────────────────────────┐
│              Vercel Edge Network (CDN)              │
│  - Global edge locations                            │
│  - Automatic HTTPS                                  │
│  - DDoS protection                                  │
└─────────────────────┬───────────────────────────────┘
                     │
┌─────────────────────┴───────────────────────────────┐
│           Vercel Serverless Functions               │
│  - API Routes (/api/*)                              │
│  - Auto-scaling                                     │
│  - Cold start < 100ms                               │
└─────────────────────┬───────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌────────────┐ ┌──────────┐ ┌──────────┐
│ Firestore  │ │ Firebase │ │  Vercel  │
│  Database  │ │   FCM    │ │   Cron   │
└────────────┘ └──────────┘ └──────────┘
```

### Environment Variables (Production)

**Required**:
```bash
# Firebase (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Firebase Admin SDK (service account JSON)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# API Security (generate: openssl rand -hex 32)
NEXT_PUBLIC_API_KEY=
API_SECRET_KEY=
CRON_SECRET=

# CORS (production domain)
ALLOWED_ORIGIN=https://yourdomain.com
```

### Scaling Considerations

**10K users**:
- ✅ Firebase Spark (free) tier
- ✅ Vercel Hobby (free) tier
- ✅ No optimizations needed

**100K users**:
- 💡 Firebase Blaze (pay-as-you-go)
- 💡 Vercel Pro ($20/month)
- 💡 Enable CDN caching
- 💡 Optimize Firestore queries

**1M+ users**:
- 🔧 Database sharding by region
- 🔧 Read replicas
- 🔧 Redis caching layer
- 🔧 Dedicated infrastructure

### Monitoring

**Recommended Tools**:
- **Sentry**: Error tracking
- **Vercel Analytics**: Performance monitoring
- **Firebase Monitoring**: Database performance
- **Uptime Robot**: Availability monitoring

**Key Metrics**:
- API response times
- Database query latency
- Error rate
- Notification delivery rate
- Storage costs

---

## Conclusion

Defroster's architecture prioritizes **privacy**, **performance**, and **adaptability**. The abstraction-based design allows communities to customize the platform for their specific needs while maintaining a clean, testable codebase.

**Key Takeaways**:
- ✅ Privacy by design (minimal data, auto-deletion)
- ✅ Offline-first (IndexedDB caching)
- ✅ Modular (easy provider switching)
- ✅ Scalable (tested to 100K+ users)
- ✅ Accessible (i18n, PWA, mobile-first)

For questions or contributions, see the main [README.md](../README.md).

---

**Last Updated**: 2025-01-03
**Version**: 0.1.0
