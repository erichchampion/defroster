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
export const NOTIFICATIONS_COLLECTION = 'notifications';

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

// Location tracking settings
export const SIGNIFICANT_LOCATION_CHANGE_MILES = 0.5; // Threshold for triggering location updates

// Geohash precision settings
export const GEOHASH_PRECISION_DEVICE = 7; // ~76m precision for device locations
export const GEOHASH_PRECISION_AREA = 5; // ~5km precision for area grouping

// Geolocation watch options (optimized for battery life)
export const LOCATION_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: false, // Use network location for battery efficiency
  timeout: 30000, // 30 seconds
  maximumAge: 300000, // 5 minutes - allow cached location
};

// Leaflet CDN
export const LEAFLET_CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';
