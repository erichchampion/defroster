/**
 * Application configuration constants
 */

import { MILES_TO_METERS } from './conversions';

// Radius settings
export const DEFAULT_RADIUS_MILES = 5;
export const RADIUS_OPTIONS = [1, 5, 10, 25] as const;
export const DEFAULT_RADIUS_METERS = DEFAULT_RADIUS_MILES * MILES_TO_METERS;

// Firestore collection names
export const MESSAGES_COLLECTION = 'messages';
export const DEVICES_COLLECTION = 'devices';

// IndexedDB settings
export const DB_NAME = 'DefrosterDB';
export const DB_VERSION = 1;
export const MESSAGES_STORE = 'messages';

// LocalStorage keys
export const STORAGE_KEYS = {
  FCM_TOKEN: 'defroster_fcm_token',
  FCM_TOKEN_TIMESTAMP: 'defroster_fcm_token_timestamp',
  DEVICE_ID: 'defroster_device_id',
  DEVICE_ID_TIMESTAMP: 'defroster_device_id_timestamp',
} as const;

// Leaflet CDN
export const LEAFLET_CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';
