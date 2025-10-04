/**
 * Time duration constants in milliseconds
 */

export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

// Application-specific durations
export const MESSAGE_EXPIRATION_MS = 24 * ONE_HOUR_MS; // 24 hours for server-side storage
export const NOTIFICATION_WINDOW_MS = 30 * ONE_MINUTE_MS; // Only send notifications for messages <30 min old
export const FCM_TOKEN_MAX_AGE_MS = 30 * ONE_DAY_MS;
export const MESSAGE_REFRESH_INTERVAL_MS = 30 * ONE_SECOND_MS; // 30 seconds
export const CLEANUP_INTERVAL_MS = 15 * ONE_MINUTE_MS;
export const OLD_MESSAGE_CLEANUP_INTERVAL_MS = 24 * ONE_HOUR_MS; // Once daily
export const GEOLOCATION_TIMEOUT_MS = 10 * ONE_SECOND_MS;
export const TIMESTAMP_TOLERANCE_MS = ONE_MINUTE_MS; // API timestamp validation tolerance

// Local database retention
export const LOCAL_DB_RETENTION_MS = ONE_WEEK_MS; // Keep local records for 1 week

// Notification tracking retention
export const NOTIFICATION_RECORD_RETENTION_MS = 2 * ONE_HOUR_MS; // Keep notification records for 2 hours
