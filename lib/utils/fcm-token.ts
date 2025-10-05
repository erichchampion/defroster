/**
 * FCM Token persistence utilities
 */

import { STORAGE_KEYS } from '@/lib/constants/app';

/**
 * Save FCM token to localStorage with timestamp
 * @param token The FCM token to save
 */
export const saveFCMToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP, Date.now().toString());
};

/**
 * Remove FCM token from localStorage
 */
export const removeFCMToken = (): void => {
  localStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.FCM_TOKEN_TIMESTAMP);
};
