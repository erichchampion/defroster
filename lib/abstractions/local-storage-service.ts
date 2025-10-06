import { Message, GeoLocation } from '@/lib/types/message';
import { AppState } from '@/lib/types/app-state';

/**
 * Local storage service abstraction for client-side data persistence.
 *
 * @remarks
 * This service provides a unified interface for client-side storage operations,
 * primarily used for offline-first functionality and state persistence. The current
 * implementation uses IndexedDB, but can be swapped for other storage mechanisms
 * (localStorage, AsyncStorage, SQLite) by implementing this interface.
 *
 * Key features:
 * - Message caching with 1-week retention (vs 1-day server retention)
 * - Geospatial queries using distance calculations
 * - Incremental fetch tracking per geohash area
 * - Application state persistence for iOS PWA lifecycle support
 *
 * @see {@link IndexedDBStorageService} for the default implementation
 *
 * @example
 * ```typescript
 * const storage = new IndexedDBStorageService();
 * await storage.initialize();
 *
 * // Save messages from server
 * await storage.saveMessages(serverMessages);
 *
 * // Query messages within radius
 * const nearby = await storage.getMessagesInRadius(location, 5);
 * ```
 */
export interface ILocalStorageService {
  /**
   * Initialize the storage service.
   *
   * @remarks
   * Must be called before any other operations. For IndexedDB, this opens
   * the database connection and creates object stores if needed.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws Error if initialization fails (e.g., storage quota exceeded)
   */
  initialize(): Promise<void>;

  /**
   * Save a single message to local storage.
   *
   * @param message - The message to save
   * @returns Promise that resolves when the message is saved
   * @throws Error if the save operation fails
   */
  saveMessage(message: Message): Promise<void>;

  /**
   * Save multiple messages to local storage in a single transaction.
   *
   * @remarks
   * More efficient than calling saveMessage() multiple times.
   * Used when syncing with server data.
   *
   * @param messages - Array of messages to save
   * @returns Promise that resolves when all messages are saved
   * @throws Error if any message fails to save
   */
  saveMessages(messages: Message[]): Promise<void>;

  /**
   * Get all messages within a specified radius of a location.
   *
   * @remarks
   * Performs geospatial filtering using the Haversine formula to calculate
   * great-circle distances. Also filters out expired messages.
   *
   * @param location - Center point for the search
   * @param radiusMiles - Search radius in miles
   * @returns Promise resolving to array of messages, sorted by timestamp (newest first)
   */
  getMessagesInRadius(location: GeoLocation, radiusMiles: number): Promise<Message[]>;

  /**
   * Get all messages from local storage, including expired ones.
   *
   * @returns Promise resolving to array of all messages, sorted by timestamp (newest first)
   */
  getAllMessages(): Promise<Message[]>;

  /**
   * Delete a specific message by ID.
   *
   * @param id - The message ID to delete
   * @returns Promise that resolves when the message is deleted
   */
  deleteMessage(id: string): Promise<void>;

  /**
   * Delete all messages that have passed their expiration time.
   *
   * @remarks
   * Should be called periodically (e.g., every 15 minutes) to clean up
   * expired messages and free storage space.
   *
   * @returns Promise resolving to the number of messages deleted
   */
  deleteExpiredMessages(): Promise<number>;

  /**
   * Delete messages older than a specified age.
   *
   * @param maxAgeMs - Maximum age in milliseconds
   * @returns Promise resolving to the number of messages deleted
   */
  deleteOldMessages(maxAgeMs: number): Promise<number>;

  /**
   * Delete messages older than one week.
   *
   * @remarks
   * Convenience method for the standard 1-week retention policy.
   * Should be called daily to maintain the local retention limit.
   *
   * @returns Promise resolving to the number of messages deleted
   */
  deleteMessagesOlderThanOneWeek(): Promise<number>;

  /**
   * Delete all messages from local storage.
   *
   * @remarks
   * Used for complete data reset. Does not affect app state.
   *
   * @returns Promise that resolves when all messages are deleted
   */
  clearAll(): Promise<void>;

  /**
   * Save application state to local storage.
   *
   * @remarks
   * Used for persisting app state across page reloads, especially important
   * for iOS PWAs which may terminate the app when backgrounded. State includes
   * location permissions, notification settings, and last known location.
   *
   * State has a 7-day TTL and will be ignored if older.
   *
   * @param state - Partial app state object (only changed fields needed)
   * @returns Promise that resolves when state is saved
   *
   * @example
   * ```typescript
   * await storage.saveAppState({
   *   lastKnownLocation: { latitude: 37.7749, longitude: -122.4194, timestamp: Date.now() },
   *   locationPermissionGranted: true
   * });
   * ```
   */
  saveAppState(state: Partial<AppState>): Promise<void>;

  /**
   * Retrieve application state from local storage.
   *
   * @remarks
   * Returns null if no state exists or if the state is older than 7 days.
   *
   * @returns Promise resolving to app state, or null if not found/expired
   */
  getAppState(): Promise<AppState | null>;

  /**
   * Clear application state from local storage.
   *
   * @remarks
   * Used for resetting the app to initial state (e.g., testing, logout).
   *
   * @returns Promise that resolves when state is cleared
   */
  clearAppState(): Promise<void>;
}
