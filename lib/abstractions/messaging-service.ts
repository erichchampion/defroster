import { Message } from '@/lib/types/message';

/**
 * Push notification service abstraction layer.
 *
 * @remarks
 * Provides a unified interface for push notification services, enabling
 * easy switching between providers (Firebase Cloud Messaging, OneSignal,
 * Pusher Beams, native APNS/FCM, etc.) without changing application code.
 *
 * The current implementation uses Firebase Cloud Messaging (FCM) for
 * cross-platform push notifications with service worker support for
 * background message handling.
 *
 * @see {@link FCMMessagingService} for the Firebase implementation
 *
 * @example
 * ```typescript
 * const messaging = new FCMMessagingService();
 * await messaging.initialize();
 *
 * // Request permission and get token
 * const granted = await messaging.requestPermission();
 * if (granted) {
 *   const token = await messaging.getToken();
 *   // Register token with server
 * }
 *
 * // Listen for messages
 * messaging.onMessage((message) => {
 *   console.log('Received:', message);
 * });
 * ```
 */
export interface IMessagingService {
  /**
   * Initialize the messaging service.
   *
   * @remarks
   * For FCM, this loads the Firebase SDK and registers the service worker
   * for background message handling. Must be called before any other operations.
   *
   * Safe to call multiple times - subsequent calls are no-ops.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws Error if service worker registration fails or Firebase config is invalid
   */
  initialize(): Promise<void>;

  /**
   * Request permission to send push notifications to the user.
   *
   * @remarks
   * Shows the browser's native permission dialog. On iOS, this must be
   * triggered by a user action (e.g., button click) to work.
   *
   * Permission states:
   * - 'granted': User approved notifications
   * - 'denied': User rejected notifications (cannot re-request)
   * - 'default': User hasn't decided yet
   *
   * @returns Promise resolving to true if permission granted, false otherwise
   */
  requestPermission(): Promise<boolean>;

  /**
   * Get the device token for push notifications.
   *
   * @remarks
   * This token uniquely identifies the device and is used to send targeted
   * push notifications. Token may change over time (app reinstall, token refresh)
   * so should be refreshed periodically and re-registered with the server.
   *
   * For FCM, this is the Firebase Cloud Messaging registration token.
   *
   * @returns Promise resolving to the device token, or null if unavailable
   * @throws Error if messaging service is not initialized or permission not granted
   */
  getToken(): Promise<string | null>;

  /**
   * Send a push notification to specific device tokens.
   *
   * @remarks
   * Typically called server-side (using Admin SDK) rather than client-side.
   * Included in the interface for completeness and server-side implementations.
   *
   * @param tokens - Array of device tokens to send to
   * @param message - Message object containing notification data
   * @returns Promise that resolves when messages are sent
   * @throws Error if sending fails or tokens are invalid
   */
  sendToDevices(tokens: string[], message: Message): Promise<void>;

  /**
   * Subscribe to incoming push messages.
   *
   * @remarks
   * Callback fires when a message is received while the app is in the foreground.
   * Background messages are handled by the service worker automatically.
   *
   * Only one callback can be registered at a time. Calling again replaces
   * the previous callback.
   *
   * @param callback - Function to call when a message is received
   *
   * @example
   * ```typescript
   * messaging.onMessage((message) => {
   *   // Update UI with new sighting
   *   addMessageToList(message);
   *   // Save to local cache
   *   await storage.saveMessage(message);
   * });
   * ```
   */
  onMessage(callback: (message: Message) => void): void;

  /**
   * Unsubscribe from incoming messages.
   *
   * @remarks
   * Removes the message callback registered with onMessage().
   * Call this during component cleanup to prevent memory leaks.
   *
   * @example
   * ```typescript
   * useEffect(() => {
   *   messaging.onMessage(handleMessage);
   *   return () => messaging.offMessage();
   * }, []);
   * ```
   */
  offMessage(): void;

  /**
   * Set up a callback for when the FCM token is refreshed.
   *
   * @remarks
   * Tokens can be refreshed by FCM periodically. When this happens,
   * the new token should be registered with the server.
   *
   * @param callback - Function to call with the new token
   */
  onTokenRefresh(callback: (token: string) => void): void;

  /**
   * Manually refresh the FCM token.
   *
   * @remarks
   * Forces a token refresh. Useful when token may have changed
   * (e.g., after app reinstall or cache clear).
   *
   * @returns Promise resolving to the new token, or null if unavailable
   */
  refreshToken(): Promise<string | null>;
}
