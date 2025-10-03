/**
 * Utility functions for managing anonymous device IDs
 */

/**
 * Generate a new UUID v4
 */
export function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create device ID from localStorage
 */
export function getOrCreateDeviceId(storageKey: string): string {
  if (typeof window === 'undefined') {
    return generateDeviceId();
  }

  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(storageKey, deviceId);
  }

  return deviceId;
}

/**
 * Check if device ID needs rotation (older than specified age)
 */
export function shouldRotateDeviceId(
  timestampKey: string,
  maxAgeMs: number
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const timestamp = localStorage.getItem(timestampKey);

  if (!timestamp) {
    return true;
  }

  const age = Date.now() - parseInt(timestamp);
  return age > maxAgeMs;
}

/**
 * Rotate device ID (generate new one and update timestamp)
 */
export function rotateDeviceId(
  storageKey: string,
  timestampKey: string
): string {
  const newDeviceId = generateDeviceId();

  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, newDeviceId);
    localStorage.setItem(timestampKey, Date.now().toString());
  }

  return newDeviceId;
}
