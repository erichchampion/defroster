import { Message } from '@/lib/types/message';

/**
 * Abstraction layer for messaging/notification services
 * Allows easy switching between Firebase Cloud Messaging, OneSignal, Pusher, etc.
 */
export interface IMessagingService {
  /**
   * Initialize the messaging service
   */
  initialize(): Promise<void>;

  /**
   * Request permission to send notifications
   */
  requestPermission(): Promise<boolean>;

  /**
   * Get the device token for push notifications
   */
  getToken(): Promise<string | null>;

  /**
   * Send a notification to specific device tokens
   */
  sendToDevices(tokens: string[], message: Message): Promise<void>;

  /**
   * Subscribe to incoming messages
   */
  onMessage(callback: (message: Message) => void): void;

  /**
   * Unsubscribe from messages
   */
  offMessage(): void;
}
