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
- **Scheduled Jobs**: Firebase Cloud Functions (periodic notifications & cleanup)

#### Infrastructure
- **Hosting**: Vercel / Firebase Hosting / Self-hosted
- **CDN**: Vercel Edge Network / Cloudflare
- **Functions**: Firebase Cloud Functions (scheduled tasks) + Next.js API Routes
- **Storage**: IndexedDB (client-side)
- **Rate Limiting**: Upstash Redis (distributed, serverless-compatible)
- **Cron Jobs**: Vercel Cron (scheduled cleanup)

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

### 3. ILocalStorageService

**Location**: `lib/abstractions/local-storage-service.ts`

**Purpose**: Local storage abstraction.

**Interface**:
```typescript
export interface ILocalStorageService {
  // Initialization
  initialize(): Promise<void>;

  // Message operations
  saveMessage(message: Message): Promise<void>;
  saveMessages(messages: Message[]): Promise<void>;
  getMessagesInRadius(location: GeoLocation, radiusMiles: number): Promise<Message[]>;
  getAllMessages(): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;
  deleteExpiredMessages(): Promise<number>;
  deleteOldMessages(maxAgeMs?: number): Promise<number>;
  deleteMessagesOlderThanOneWeek(): Promise<number>;
  clearAll(): Promise<void>;

  // Metadata operations
  getLastFetchTime(geohash: string): Promise<number>;
  setLastFetchTime(geohash: string, timestamp: number): Promise<void>;

  // App state operations
  saveAppState(state: Partial<AppState>): Promise<void>;
  getAppState(): Promise<AppState | null>;
  clearAppState(): Promise<void>;
}
```

**Current Implementation**: `IndexedDBStorageService`

**Features**:
- Three object stores: messages, metadata, app_state
- Geohash-based spatial queries
- Incremental fetch tracking
- App state persistence with TTL
- Automatic initialization via `ensureInitialized()` helper

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

**Purpose**: Manage geolocation state with iOS PWA lifecycle support.

**Returns**:
```typescript
interface UseGeolocationReturn {
  location: GeoLocation | null;
  permissionGranted: boolean;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<GeoLocation | null>;
  updateLocation: () => Promise<GeoLocation | null>;
  startWatchingLocation: (onLocationChange?: (loc: GeoLocation) => void) => (() => void) | null;
  stopWatchingLocation: () => void;
}
```

**Key Features**:
- **Permissions API Integration**: Auto-detects previously granted permissions on mount
- **State Persistence**: Saves/restores location from IndexedDB
- **Permission Monitoring**: Listens for permission changes
- **Location Watching**: Background location updates with significant change detection
- **Error Handling**: Centralized error handler for consistent UX
- **iOS Optimization**: Automatic restoration after app backgrounding

**Implementation**:
```typescript
// Check existing permission on mount
useEffect(() => {
  const checkExistingPermission = async () => {
    if (!('permissions' in navigator)) return;

    const result = await navigator.permissions.query({ name: 'geolocation' });

    if (result.state === 'granted') {
      // Auto-restore location without user interaction
      await requestPermission();
    }

    // Listen for permission changes
    result.addEventListener('change', handlePermissionChange);
  };

  checkExistingPermission();
}, []);

// Restore location from IndexedDB
useEffect(() => {
  const restoreLocationState = async () => {
    const savedState = await storageService.getAppState();
    if (savedState?.lastKnownLocation && savedState.locationPermissionGranted) {
      setLocation({
        latitude: savedState.lastKnownLocation.latitude,
        longitude: savedState.lastKnownLocation.longitude,
      });
    }
  };

  restoreLocationState();
}, [storageService]);

// Save location changes to IndexedDB
useEffect(() => {
  if (location && permissionGranted) {
    storageService.saveAppState({
      lastKnownLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
      },
      locationPermissionGranted: true,
    }).catch(handleStateSaveError('save location state'));
  }
}, [location, permissionGranted, storageService]);
```

#### 2. useMessaging (`app/hooks/useMessaging.ts`)

**Purpose**: Manage messaging state and operations with FCM token persistence.

**Returns**:
```typescript
interface UseMessagingReturn {
  // State
  token: string | null;
  deviceId: string | null;
  permission: NotificationPermission;
  messages: Message[];
  error: string | null;
  isOffline: boolean;

  // Operations
  requestPermission: () => Promise<string | null>;
  registerDevice: (location: GeoLocation, fcmToken?: string, devId?: string) => Promise<boolean>;
  updateDeviceLocation: (newLocation: GeoLocation) => Promise<boolean>;
  sendMessage: (sightingType: SightingType, location: GeoLocation, senderLocation: GeoLocation) => Promise<any>;
  getMessages: (location: GeoLocation) => Promise<Message[]>;
  setupMessageListener: () => () => void;
  clearLocalStorage: () => Promise<void>;
  cleanupExpiredMessages: () => Promise<void>;
  cleanupOldMessages: () => Promise<number>;
  refreshToken: (location?: GeoLocation) => Promise<string | null>;
}
```

**Key Features**:
- **Token Restoration**: Auto-restores FCM token if notification permission granted
- **State Persistence**: Saves notification permission and device registration state
- **Incremental Queries**: Tracks last fetch time per geohash area for efficient updates
- **Offline Support**: Detects network status, loads from IndexedDB when offline
- **Token Management**: Uses `saveFCMToken()` utility for consistent persistence
- **Error Handling**: Consistent error handling via `handleStateSaveError()`

**Implementation**:
```typescript
// Restore FCM token on mount if permission granted
useEffect(() => {
  const checkExistingNotificationPermission = async () => {
    if (Notification.permission === 'granted' && !token) {
      await messagingService.initialize();
      const fcmToken = await messagingService.getToken();

      if (fcmToken) {
        saveFCMToken(fcmToken);  // Utility function
        setToken(fcmToken);

        await localStorageService.saveAppState({
          notificationPermissionGranted: true,
        }).catch(handleStateSaveError('save notification permission state'));
      }
    }
  };

  checkExistingNotificationPermission();
}, []);

// Save device registration state
const registerDevice = useCallback(async (location, fcmToken?, devId?) => {
  // ... register device

  await localStorageService.saveAppState({
    deviceRegistered: true,
    notificationPermissionGranted: true,
    lastDeviceRegistrationTime: Date.now(),
  }).catch(handleStateSaveError('save device registration state'));
}, [token, deviceId, localStorageService]);

// Incremental message fetching with dual retention (1 week local, 1 day server)
const getMessages = useCallback(async (location) => {
  const geohash = geohashForLocation([location.latitude, location.longitude]);
  const lastFetchTime = await localStorageService.getLastFetchTime(geohash);
  const isIncrementalQuery = lastFetchTime > 0;

  if (isOffline) {
    // Load from IndexedDB
    const localMessages = await localStorageService.getMessagesInRadius(location, DEFAULT_RADIUS_MILES);
    setMessages(localMessages);
    return localMessages;
  }

  // Fetch from server with sinceTimestamp for incremental updates
  const response = await fetch('/api/get-messages', {
    body: JSON.stringify({
      location,
      sinceTimestamp: isIncrementalQuery ? lastFetchTime : undefined
    })
  });

  const { messages: serverMessages } = await response.json();

  // Save new messages to IndexedDB
  if (serverMessages.length > 0) {
    await localStorageService.saveMessages(serverMessages);
  }
  await localStorageService.setLastFetchTime(geohash, Date.now());

  // ALWAYS merge with local messages to honor 1-week retention
  // Server only keeps 1 day, but local keeps 1 week
  const localMessages = await localStorageService.getMessagesInRadius(location, DEFAULT_RADIUS_MILES);

  setMessages(localMessages);
  return localMessages;
}, [localStorageService, isOffline]);
```

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

Defroster implements a **Backend-for-Frontend (BFF)** security pattern to protect API routes without exposing secrets to clients.

#### Origin Validation (BFF Pattern)

Instead of embedding API keys in client code (which can be extracted), the app validates that requests come from the legitimate application origin:

```typescript
// lib/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';

export function validateOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  const allowedOrigin = process.env.NEXT_PUBLIC_BASE_URL;

  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    if (origin?.startsWith('http://localhost:')) {
      return null;
    }
  }

  // Validate origin matches configured base URL
  if (origin !== allowedOrigin) {
    return NextResponse.json(
      { error: 'Unauthorized origin' },
      { status: 403 }
    );
  }

  return null;
}
```

**Usage in API Routes**:
```typescript
// app/api/send-message/route.ts
import { validateOrigin } from '@/lib/middleware/auth';
import { checkAndApplyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit-upstash';

export async function POST(request: Request) {
  // 1. Validate request origin (BFF pattern)
  const authError = validateOrigin(request);
  if (authError) return authError;

  // 2. Apply rate limiting
  const rateLimitError = await checkAndApplyRateLimit(request, RATE_LIMITS.SEND_MESSAGE);
  if (rateLimitError) return rateLimitError;

  // 3. Process request...
}
```

**Why this approach?**
- ✅ No exposed API keys in client code
- ✅ CORS protection prevents unauthorized domains
- ✅ Simple to implement and maintain
- ✅ Works with standard browser security features
- ⚠️ Not suitable if you need third-party API access

#### Distributed Rate Limiting (Upstash Redis)

In-memory rate limiting doesn't work in serverless environments where each request may hit a different instance. Upstash Redis provides shared state across all serverless functions:

```typescript
// lib/middleware/rate-limit-upstash.ts
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️  Upstash Redis not configured - rate limiting will be disabled');
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export async function checkAndApplyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const redis = getRedisClient();

  // Fail open if Redis unavailable (development mode)
  if (!redis) {
    return null;
  }

  const clientId = getClientIdentifier(request); // IP-based
  const key = `ratelimit:${clientId}`;
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  // Atomic increment with Redis
  const count = await redis.incr(key);

  // Set expiration on first request
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  // Check if limit exceeded
  if (count > config.maxRequests) {
    const ttl = await redis.ttl(key);
    const resetTime = Date.now() + (ttl * 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil(ttl),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(ttl).toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
        },
      }
    );
  }

  return null;
}

// Rate limit configurations
export const RATE_LIMITS = {
  SEND_MESSAGE: { maxRequests: 5, windowMs: 60000 },      // 5 per minute
  REGISTER_DEVICE: { maxRequests: 3, windowMs: 60000 },   // 3 per minute
  GET_MESSAGES: { maxRequests: 20, windowMs: 60000 },     // 20 per minute
  CLEANUP: { maxRequests: 1, windowMs: 300000 },          // 1 per 5 minutes
} as const;
```

**Why Upstash Redis?**
- ✅ Works in serverless environments (Vercel, AWS Lambda)
- ✅ Shared state across all function instances
- ✅ Low latency with edge-compatible REST API
- ✅ Automatic cleanup via TTL (no manual cleanup needed)
- ✅ Free tier available (10,000 commands/day)
- ✅ No connection pooling needed (REST API)

**Alternative: In-Memory (Development Only)**
```typescript
// ⚠️ Only for local development - does NOT work in production serverless
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
```

#### Cron Job Protection (Timing-Safe)

The `/api/cleanup-messages` endpoint is protected with a secret token using constant-time comparison to prevent timing attacks:

```typescript
// lib/middleware/auth.ts
import { timingSafeEqual } from 'crypto';

export function validateCronSecret(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Constant-time comparison to prevent timing attacks
  const tokenBuffer = Buffer.from(token, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSecret, 'utf-8');

  if (tokenBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(tokenBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
```

**Why constant-time comparison?**
- ❌ `token === expectedSecret` - Vulnerable to timing attacks
- ✅ `timingSafeEqual(token, expected)` - Prevents timing attacks by always taking the same time regardless of where strings differ

**Vercel Cron Configuration** (`vercel.json`):
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

### 6. Firestore Security Rules

Firestore security rules enforce server-write only access, preventing client-side data manipulation:

**Location**: `firestore.rules`

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Messages: Public read, server-write only
    match /messages/{messageId} {
      allow read: if true;  // Anyone can read messages
      allow write: if false; // Only Admin SDK can write
    }

    // Devices: No client access
    match /devices/{deviceId} {
      allow read: if false;  // Only Admin SDK (privacy)
      allow write: if false; // Only Admin SDK
    }

    // Notifications: Server-only access
    match /notifications/{notificationId} {
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
- ✅ Prevents spam and fake reports
- ✅ Server validates all data (location, timestamps, types)
- ✅ Controls notification sending (prevents abuse)
- ✅ Enables rate limiting and abuse detection
- ✅ Protects device tokens from being read by clients
- ✅ Prevents clients from manipulating expiration times

**Deployment**:
```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Test rules locally
firebase emulators:start --only firestore
```

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

**Version**: 3

#### Object Store 1: `messages`

**Key Path**: `id`

**Indexes**:
```typescript
{
  timestamp: { unique: false },     // For time-based queries
  expiresAt: { unique: false },     // For cleanup
  sightingType: { unique: false },  // For filtering
  latitude: { unique: false },      // For geospatial queries
  longitude: { unique: false }      // For geospatial queries
}
```

#### Object Store 2: `metadata`

**Key Path**: `key`

**Purpose**: Store last fetch timestamps for geohash areas

**Document Structure**:
```typescript
{
  key: "fetch_dp3wj",  // "fetch_" + 5-char geohash
  timestamp: number,
  geohash: string
}
```

#### Object Store 3: `app_state`

**Key Path**: `key`

**Purpose**: Persist application state for iOS PWA lifecycle

**Document Structure**:
```typescript
interface AppState {
  key: 'app_state';  // Always this value
  lastKnownLocation: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null;
  locationPermissionGranted: boolean;
  notificationPermissionGranted: boolean;
  deviceRegistered: boolean;
  lastDeviceRegistrationTime: number;
  appInitialized: boolean;
  lastActiveTimestamp: number;
  updatedAt: number;
}
```

**Schema Definition**:
```typescript
// lib/services/indexeddb-storage-service.ts
const request = indexedDB.open('DefrosterDB', 3);

request.onupgradeneeded = (event) => {
  const db = event.target.result;

  // Messages store
  if (!db.objectStoreNames.contains('messages')) {
    const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
    messageStore.createIndex('expiresAt', 'expiresAt', { unique: false });
    messageStore.createIndex('sightingType', 'sightingType', { unique: false });
    messageStore.createIndex('latitude', 'location.latitude', { unique: false });
    messageStore.createIndex('longitude', 'location.longitude', { unique: false });
  }

  // Metadata store
  if (!db.objectStoreNames.contains('metadata')) {
    db.createObjectStore('metadata', { keyPath: 'key' });
  }

  // App state store
  if (!db.objectStoreNames.contains('app_state')) {
    db.createObjectStore('app_state', { keyPath: 'key' });
  }
};
```

**State Persistence Methods**:
```typescript
class IndexedDBStorageService implements ILocalStorageService {
  // Ensure DB is initialized before operations
  private async ensureInitialized(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    return this.db;
  }

  async saveAppState(state: Partial<AppState>): Promise<void> {
    await this.ensureInitialized();
    // Save state with updatedAt timestamp
  }

  async getAppState(): Promise<AppState | null> {
    await this.ensureInitialized();
    // Return state if age < APP_STATE_MAX_AGE_MS, else null
  }

  async clearAppState(): Promise<void> {
    await this.ensureInitialized();
    // Remove app_state entry
  }
}
```

---

## API Architecture

### Endpoint Overview

| Endpoint | Method | Auth | Rate Limit | Purpose |
|----------|--------|------|------------|---------|
| `/api/send-message` | POST | Origin | 5/min | Create sighting report |
| `/api/get-messages` | POST | Origin | 20/min | Fetch nearby sightings |
| `/api/register-device` | POST | Origin | 3/min | Register for notifications |
| `/api/cleanup-messages` | POST | Cron Secret | 1/5min | Delete expired messages |

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
Origin: https://yourdomain.com
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
1. Validate origin (BFF pattern)
2. Apply rate limiting (Upstash Redis)
3. Validate input (lat/lng, sighting type, timestamp)
4. Generate message ID (UUID v4)
5. Calculate geohash (7 chars)
6. Set expiration (now + 24 hours)
7. Save to Firestore
8. Find nearby devices (5-mile radius)
9. Send FCM notifications via Admin SDK
10. Record notification deliveries
11. Return success with notification count

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
1. Validate origin (BFF pattern)
2. Apply rate limiting (Upstash Redis)
3. Validate location coordinates
4. Calculate geohash bounds for 5-mile radius
5. Query Firestore with bounds
6. Filter by sinceTimestamp if provided (incremental query)
7. Calculate actual distance (great circle)
8. Filter by exact radius
9. Return sorted by timestamp (newest first)

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
1. Validate origin (BFF pattern)
2. Apply rate limiting (Upstash Redis)
3. Validate FCM token format (140-300 chars, alphanumeric)
4. Validate device ID format (UUID v4)
5. Validate location coordinates
6. Calculate geohash (7 chars for privacy)
7. Upsert device document (deviceId as doc ID)
8. Set updatedAt timestamp
9. Return success

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
Authorization: Bearer <CRON_SECRET>
```

**Response**:
```typescript
{
  success: true,
  deletedCount: 47
}
```

**Process Flow**:
1. Validate cron secret (timing-safe comparison)
2. Apply rate limiting (1 per 5 minutes)
3. Query messages where `expiresAt < now`
4. Batch delete (max 500 per batch)
5. Return deleted count

**Note**: Messages expire after 24 hours on server. Clients maintain local copies for up to 1 week.

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

## Data Retention Strategy

### Dual Retention Policy

Defroster implements a **dual retention strategy** to balance privacy, performance, and user experience:

**Server-Side (Firestore)**: **1 day retention**
- Messages expire after 24 hours (`MESSAGE_EXPIRATION_MS = 24 * ONE_HOUR_MS`)
- Minimizes server storage costs
- Reduces privacy risk (less long-term data)
- Cleaned up hourly via cron job

**Client-Side (IndexedDB)**: **1 week retention**
- Messages stored locally for 7 days (`LOCAL_DB_RETENTION_MS = ONE_WEEK_MS`)
- Enables offline access to historical data
- Better user experience (see older sightings)
- Cleaned up daily on client

### Incremental Query Optimization

To minimize bandwidth and server load, the app tracks the last fetch time for each geohash area and only queries for updates:

**Implementation**:
```typescript
// app/hooks/useMessaging.ts
const getMessages = useCallback(async (location: GeoLocation) => {
  const geohash = geohashForLocation([location.latitude, location.longitude], GEOHASH_PRECISION_AREA);
  const lastFetchTime = await localStorageService.getLastFetchTime(geohash);
  const isIncrementalQuery = lastFetchTime > 0;

  // Query server with sinceTimestamp for incremental updates
  const response = await fetch('/api/get-messages', {
    body: JSON.stringify({
      location,
      sinceTimestamp: isIncrementalQuery ? lastFetchTime : undefined
    })
  });

  const { messages: serverMessages } = await response.json();

  // Save new messages to IndexedDB
  if (serverMessages.length > 0) {
    await localStorageService.saveMessages(serverMessages);
  }
  await localStorageService.setLastFetchTime(geohash, Date.now());

  // CRITICAL: Always query IndexedDB after saving server messages
  // This ensures we include messages that are 1-7 days old (expired on server)
  const localMessages = await localStorageService.getMessagesInRadius(location, DEFAULT_RADIUS_MILES);

  setMessages(localMessages);
  return localMessages;
}, [localStorageService, isOffline]);
```

**Server-Side Filtering** (`app/api/get-messages/route.ts`):
```typescript
let messages = await dataService.getMessagesInRadius(location, radiusMiles);

// Filter by timestamp if sinceTimestamp provided (incremental query)
if (sinceTimestamp && sinceTimestamp > 0) {
  messages = messages.filter(msg => msg.timestamp > sinceTimestamp);
  logger.info('API:get-messages', `Incremental query: found ${messages.length} messages since ${new Date(sinceTimestamp).toISOString()}`);
} else {
  logger.info('API:get-messages', `Full query: found ${messages.length} messages`);
}

return NextResponse.json({ messages });
```

### Why Always Merge with Local Data?

**Bug Fix (2025-10-05)**: The original implementation had a critical bug where initial queries would return only server data, bypassing IndexedDB. This meant:

❌ **Before Fix**: Messages 1-7 days old (expired on server but valid locally) were not shown
✅ **After Fix**: All queries merge with IndexedDB to leverage the full 1-week retention

**Data Flow**:
```
Initial Query (first time in area):
1. Server returns messages < 1 day old
2. Save to IndexedDB
3. Query IndexedDB for ALL messages < 1 week old
4. Display merged result (server + older cached messages)

Incremental Query (subsequent requests):
1. Server returns NEW messages since last fetch
2. Save new messages to IndexedDB
3. Query IndexedDB for ALL messages < 1 week old
4. Display merged result
```

**Benefits**:
- ✅ Honors 1-week local retention policy
- ✅ Users see all valid messages, not just fresh ones
- ✅ Better user experience after app restarts
- ✅ Efficient bandwidth usage (incremental updates)
- ✅ Offline-first architecture maintained

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

**Strategy**: SEO-friendly, server-side rendered locale routes with JSON-based translations.

**Files**:
```
app/
├── [locale]/           # Dynamic locale routes
│   ├── layout.tsx      # Server-rendered layout with i18n metadata
│   └── page.tsx        # Client component (uses translations)
├── layout.tsx          # Root layout (minimal)
└── ClientProviders.tsx # Client context providers
middleware.ts           # Locale detection & redirection
lib/i18n/
├── en.json             # English translations
├── es.json             # Spanish translations
├── i18n.ts             # Utilities (locales, types, helpers)
└── I18nContext.tsx     # React Context (client-side)
```

### URL Structure

**Locale-Based Routing**:
- `/` → **Redirects** to `/en-us` or `/es-us` (based on `Accept-Language` header)
- `/en-us` → English version (**server-rendered**, crawlable)
- `/es-us` → Spanish version (**server-rendered**, crawlable)

**SEO Benefits**:
- ✅ Each locale has its own URL (better for search engines)
- ✅ Server-rendered metadata (title, description, Open Graph)
- ✅ Proper `<html lang="en">` or `<html lang="es">` attributes
- ✅ No client-side language switching (instant, no flicker)

### Middleware (Locale Detection)

**Location**: `middleware.ts`

**Purpose**: Detect browser language and redirect to appropriate locale.

**Implementation**:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en-us', 'es-us'];
const defaultLocale = 'en-us';

function getLocale(request: NextRequest): string {
  // 1. Check cookie preference
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // 2. Parse Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, q = 'q=1'] = lang.trim().split(';');
        return { code: code.toLowerCase(), quality: parseFloat(q.split('=')[1] || '1') };
      })
      .sort((a, b) => b.quality - a.quality);

    // Check for Spanish
    for (const lang of languages) {
      if (lang.code.startsWith('es')) {
        return 'es-us';
      }
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  // Check if locale already in path
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Redirect to locale
  if (pathname === '/') {
    const locale = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;

    const response = NextResponse.redirect(url);
    // Set cookie to remember preference
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  }

  return NextResponse.next();
}
```

### Server-Side Layout (Localized Metadata)

**Location**: `app/[locale]/layout.tsx`

**Purpose**: Generate server-rendered metadata and HTML lang attribute for each locale.

**Implementation**:
```typescript
import { locales, localeToLanguage, getTranslationsByLocale, type Locale } from "@/lib/i18n/i18n";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params as { locale: Locale };
  const translations = getTranslationsByLocale(locale);
  const language = localeToLanguage(locale);

  return {
    title: translations.app.title,
    description: translations.app.description,
    openGraph: {
      locale: language === 'es' ? 'es_US' : 'en_US',
      title: translations.app.title,
      description: translations.app.description,
    },
    // ... more metadata
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params as { locale: Locale };
  const language = localeToLanguage(locale);

  return (
    <html lang={language}>
      <body>
        <ClientProviders initialLocale={locale}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
```

**Key Features**:
- ✅ `generateStaticParams()` pre-renders all locale pages at build time
- ✅ `generateMetadata()` creates SEO-friendly, localized metadata
- ✅ `<html lang="en">` or `<html lang="es">` for accessibility
- ✅ `initialLocale` passed to client context (prevents hydration mismatch)

### Translation Structure

**Example** (`lib/i18n/en.json`):
```json
{
  "app": {
    "name": "Defroster",
    "title": "Defroster - Report Sightings",
    "description": "Real-time location-based safety alerts"
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

### I18n Utilities

**Location**: `lib/i18n/i18n.ts`

**Types**:
```typescript
export type Language = 'en' | 'es';
export type Locale = 'en-us' | 'es-us';
export type TranslationKeys = typeof en;

export const locales: Locale[] = ['en-us', 'es-us'];
export const defaultLocale: Locale = 'en-us';
```

**Key Functions**:
```typescript
// Convert locale to language
export function localeToLanguage(locale: Locale): Language {
  return locale.split('-')[0] as Language;
}

// Convert language to locale
export function languageToLocale(language: Language): Locale {
  return `${language}-us` as Locale;
}

// Get translations by locale
export function getTranslationsByLocale(locale: Locale): TranslationKeys {
  return getTranslations(localeToLanguage(locale));
}

// Browser language detection (client-side fallback)
export function getBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('es')) return 'es';

  return 'en';
}
```

### Client Context (React)

**Location**: `lib/contexts/I18nContext.tsx`

**Purpose**: Provide translations to client components (with server-provided initial locale).

**Implementation**:
```typescript
export function I18nProvider({
  children,
  initialLocale
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  // Initialize with server-provided locale
  const initialLanguage = initialLocale ? localeToLanguage(initialLocale) : 'en';
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [translations, setTranslations] = useState<TranslationKeys>(getTranslations(initialLanguage));

  // Only use browser detection if no initial locale provided
  useEffect(() => {
    if (!initialLocale) {
      const browserLang = getBrowserLanguage();
      setLanguageState(browserLang);
      setTranslations(getTranslations(browserLang));
    }
  }, [initialLocale]);

  // ... rest of context
}
```

### Usage in Components

**Server Components** (metadata, layouts):
```typescript
// app/[locale]/layout.tsx
import { getTranslationsByLocale } from '@/lib/i18n/i18n';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const translations = getTranslationsByLocale(locale);

  return {
    title: translations.app.title,
    description: translations.app.description,
  };
}
```

**Client Components** (interactive):
```typescript
// app/[locale]/page.tsx or components
'use client';

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
// Result: "5 minutes ago" or "hace 5 minutos"
```

### Adding New Languages

1. **Update types and locales** (`lib/i18n/i18n.ts`):
```typescript
export type Language = 'en' | 'es' | 'fr';
export type Locale = 'en-us' | 'es-us' | 'fr-us';

export const locales: Locale[] = ['en-us', 'es-us', 'fr-us'];
```

2. **Create translation file** (`lib/i18n/fr.json`):
```json
{
  "app": {
    "name": "Defroster",
    "title": "Defroster - Signaler les Observations"
  }
  // ... copy structure from en.json and translate
}
```

3. **Import in i18n.ts**:
```typescript
import fr from './fr.json';

const translations: Record<Language, TranslationKeys> = {
  en,
  es,
  fr,  // Add here
};
```

4. **Update middleware** (`middleware.ts`):
```typescript
const locales = ['en-us', 'es-us', 'fr-us'];  // Add locale

function getLocale(request: NextRequest): string {
  // ... existing code ...

  for (const lang of languages) {
    if (lang.code.startsWith('es')) return 'es-us';
    if (lang.code.startsWith('fr')) return 'fr-us';  // Add detection
  }

  return 'en-us';
}
```

5. **Build and test**:
```bash
npm run build
npm start

# Test redirect
curl -I -H "Accept-Language: fr-FR" http://localhost:3000/
# Should redirect to /fr-us
```

### SEO Verification

**Check Server-Rendered HTML**:
```bash
# English
curl -s http://localhost:3000/en-us | grep '<html'
# Output: <html lang="en">

# Spanish
curl -s http://localhost:3000/es-us | grep '<html'
# Output: <html lang="es">

# Check metadata
curl -s http://localhost:3000/en-us | grep '<title>'
# Output: <title>Defroster - Report Sightings</title>

curl -s http://localhost:3000/es-us | grep '<title>'
# Output: <title>Defroster - Reportar Avistamientos</title>
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

**useCallback for Hook Functions** (Code Review Fix #6):
```typescript
// app/hooks/useMessaging.ts
const getMessages = useCallback(async (location: GeoLocation) => {
  // ... implementation
}, [localStorageService, isOffline]);

const sendMessage = useCallback(async (...) => {
  // ... implementation
}, []);

const registerDevice = useCallback(async (...) => {
  // ... implementation
}, [token, deviceId]);
```

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

**Optimized Dependency Arrays**:
```typescript
// app/hooks/useGeolocation.ts
const locationRef = useRef<GeoLocation | null>(null);

// Use refs to avoid recreating callbacks
const startWatchingLocation = useCallback((
  onLocationChange?: (newLocation: GeoLocation) => void
) => {
  // Access locationRef.current instead of location state
  if (locationRef.current) {
    const distance = calculateDistance(locationRef.current, newLocation);
    // ...
  }
}, [permissionGranted]);
```

### 3. Centralized Constants

**Time Constants** (`lib/constants/time.ts`):
```typescript
export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

export const MESSAGE_EXPIRATION_MS = 24 * ONE_HOUR_MS;
export const NOTIFICATION_WINDOW_MS = 30 * ONE_MINUTE_MS;
export const FCM_TOKEN_MAX_AGE_MS = 30 * ONE_DAY_MS;
export const APP_STATE_MAX_AGE_MS = ONE_WEEK_MS;
export const GEOLOCATION_TIMEOUT_MS = 10 * ONE_SECOND_MS;
```

**Geolocation Constants** (`lib/constants/geolocation.ts`):
```typescript
export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: GEOLOCATION_TIMEOUT_MS,
  maximumAge: 0,
};
```

**App Constants** (`lib/constants/app.ts`):
```typescript
export const MILES_TO_KM = 1.60934;
export const KM_TO_MILES = 0.621371;
export const GEOHASH_PRECISION_DEVICE = 7;  // ~76m precision
export const GEOHASH_PRECISION_AREA = 5;    // ~5km precision
export const DEFAULT_RADIUS_MILES = 5;
```

**Benefits**:
- Single source of truth for all configuration values
- Easy to update timeouts/precision across entire codebase
- Improved code readability and maintainability
- Type-safe configuration

### 4. Debouncing

**Location Updates**:
```typescript
const debouncedUpdateLocation = useMemo(
  () => debounce((loc: GeoLocation) => {
    updateDeviceLocation(loc);
  }, 5000),  // Only update every 5 seconds
  []
);
```

### 5. IndexedDB Batch Operations

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

### 6. Geohash Query Optimization

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
  const distance = calculateDistance(location1, location2);
  return distance <= radiusMiles;
});
```

### 7. Centralized Utilities

**Error Handling** (`lib/utils/error-handling.ts`):
```typescript
export const handleStateSaveError = (context: string) => (err: unknown) => {
  console.error(`Failed to ${context}:`, err);
  // Optional: Add analytics tracking here in the future
};

// Usage
storageService.saveAppState({...})
  .catch(handleStateSaveError('save location state'));
```

**FCM Token Management** (`lib/utils/fcm-token.ts`):
```typescript
export const saveFCMToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP, Date.now().toString());
};

export const removeFCMToken = (): void => {
  localStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP);
};
```

**Logging** (`lib/utils/logger.ts`):
```typescript
export const logger = {
  debug: (context: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG:${context}]`, ...args);
    }
  },
  info: (context: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO:${context}]`, ...args);
    }
  },
  error: (context: string, ...args: unknown[]) => {
    console.error(`[ERROR:${context}]`, ...args);
  }
};

// Usage
logger.error('API:send-message', 'Error sending:', error);
```

### 7. Image Optimization

**PWA Icons**:
- Pre-generated all sizes (16x16 to 1024x1024)
- WebP format where supported
- Lazy loading for non-critical images

### 8. Bundle Size Optimization

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
- Removed unused imports (Code Review Fix #14)

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
# Firebase Client Configuration (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Firebase Admin SDK (service account JSON - server-side only)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Base URL for origin validation (BFF pattern)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Cron secret for scheduled cleanup (generate: openssl rand -hex 32)
CRON_SECRET=your_64_character_hex_key

# Upstash Redis for rate limiting (from Upstash Console)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Security Notes**:
- `NEXT_PUBLIC_*` variables are exposed to the client (safe for Firebase config)
- `FIREBASE_SERVICE_ACCOUNT_KEY` is server-only (never exposed to client)
- `CRON_SECRET` should be at least 32 characters for security
- `NEXT_PUBLIC_BASE_URL` must exactly match production domain
- Upstash Redis credentials are server-only

### Scaling Considerations

**10K users**:
- ✅ Firebase Spark (free) tier
- ✅ Vercel Hobby (free) tier
- ✅ Upstash Redis free tier (10K commands/day)
- ✅ No optimizations needed

**100K users**:
- 💡 Firebase Blaze (pay-as-you-go)
- 💡 Vercel Pro ($20/month)
- 💡 Upstash paid tier or Pro plan
- 💡 Enable CDN caching
- 💡 Optimize Firestore queries

**1M+ users**:
- 🔧 Database sharding by region
- 🔧 Read replicas
- 🔧 Upstash Pro with regional instances
- 🔧 CDN for static assets
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

---

**Last Updated**: 2025-10-07
**Version**: 0.4.0

---

## Changelog

### v0.4.0 (2025-10-07)
**Feature**: SEO-friendly i18n with server-side rendering
- Implemented locale-based routing (`/en-us`, `/es-us`)
- Added middleware for browser language detection and redirects
- Server-rendered metadata with localized titles, descriptions, Open Graph tags
- Proper `<html lang="en">` and `<html lang="es">` attributes for accessibility
- Cookie-based locale preference persistence
- Static generation of all locale pages at build time
- Fully crawlable by search engines

### v0.3.1 (2025-10-05)
**Bug Fix**: Data merging logic in `useMessaging.ts`
- Fixed critical bug where initial queries bypassed IndexedDB merge
- Now always queries IndexedDB after saving server messages
- Properly honors 1-week local retention vs 1-day server retention
- Added comprehensive documentation of dual retention strategy
- All 128 tests passing

### v0.3.0 (Previous)
- State persistence implementation for iOS PWA lifecycle
- Permission auto-restoration
- IndexedDB app state management

---

## Additional Documentation

For detailed implementation information, see:
- `STATE_PERSISTENCE.md` - State persistence system guide
