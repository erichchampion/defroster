// Conversion constants
export const MILES_TO_KM = 1.60934;
export const KM_TO_MILES = 0.621371;

// Time constants
export const ONE_MINUTE_MS = 60 * 1000;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

export const NOTIFICATION_WINDOW_MS = 30 * ONE_MINUTE_MS; // 30 minutes
export const TWO_HOURS_MS = 2 * ONE_HOUR_MS; // For notification expiry

// Geohash precision
export const GEOHASH_PRECISION_DEVICE = 7; // ~76m precision for device locations
export const GEOHASH_PRECISION_AREA = 5; // ~5km precision for area grouping

// Collection names
export const MESSAGES_COLLECTION = 'messages';
export const DEVICES_COLLECTION = 'devices';
export const NOTIFICATIONS_COLLECTION = 'notifications';

// App constants
export const DEFAULT_RADIUS_MILES = 5;
