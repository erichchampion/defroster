import { getToken, onMessage as onFCMMessage, Messaging, deleteToken } from 'firebase/messaging';
import { getMessagingInstance } from '@/lib/firebase/config';
import { IMessagingService } from '@/lib/abstractions/messaging-service';
import { Message, GeoLocation } from '@/lib/types/message';

export class FCMMessagingService implements IMessagingService {
  private messagingInstance: Messaging | null = null;
  private messageCallback: ((message: Message) => void) | null = null;
  private tokenRefreshCallback: ((token: string) => void) | null = null;

  /**
   * Validate location data
   */
  private isValidLocation(location: unknown): location is GeoLocation {
    if (!location || typeof location !== 'object') return false;
    const loc = location as GeoLocation;
    return (
      typeof loc.latitude === 'number' &&
      typeof loc.longitude === 'number' &&
      !isNaN(loc.latitude) &&
      !isNaN(loc.longitude) &&
      isFinite(loc.latitude) &&
      isFinite(loc.longitude) &&
      loc.latitude >= -90 &&
      loc.latitude <= 90 &&
      loc.longitude >= -180 &&
      loc.longitude <= 180
    );
  }

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Messaging service can only be initialized in the browser');
    }

    // If already initialized, skip
    if (this.messagingInstance) {
      return;
    }

    // Wait for messaging to be initialized using the helper function
    this.messagingInstance = await getMessagingInstance();

    if (this.messagingInstance) {
      console.log('FCM messaging service initialized successfully');
    } else {
      console.warn('FCM messaging not available - may not be supported or failed to initialize');
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.messagingInstance) {
      console.log('Messaging instance not available, initializing...');
      await this.initialize();
    }

    if (!this.messagingInstance) {
      console.error('Messaging not available after initialization');
      return null;
    }

    try {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('VAPID key not configured');
        return null;
      }

      const token = await getToken(this.messagingInstance, { vapidKey });

      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return null;
    }
  }

  async sendToDevices(tokens: string[], message: Message): Promise<void> {
    // This method is called from the client, but actual sending happens server-side
    // The client will call the API route to send messages
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens,
        message,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send notification');
    }
  }

  onMessage(callback: (message: Message) => void): void {
    if (!this.messagingInstance) {
      console.warn('Messaging not initialized - skipping message listener setup');
      return;
    }

    this.messageCallback = callback;

    onFCMMessage(this.messagingInstance, (payload) => {
      console.log('Message received:', payload);

      if (payload.data) {
        try {
          // Safely parse JSON data with validation
          const location = JSON.parse(payload.data.location);

          // Validate parsed data
          if (!this.isValidLocation(location)) {
            console.error('Invalid location data in FCM message');
            return;
          }

          const message: Message = {
            id: payload.data.id,
            sightingType: payload.data.sightingType as 'ICE' | 'Army' | 'Police',
            location,
            timestamp: parseInt(payload.data.timestamp || '0'),
            geohash: payload.data.geohash,
            expiresAt: parseInt(payload.data.expiresAt || '0'),
          };

          if (this.messageCallback) {
            this.messageCallback(message);
          }
        } catch (error) {
          console.error('Failed to parse FCM message data:', error);
        }
      }
    });
  }

  offMessage(): void {
    this.messageCallback = null;
  }

  onTokenRefresh(callback: (token: string) => void): void {
    this.tokenRefreshCallback = callback;
  }

  async refreshToken(): Promise<string | null> {
    if (!this.messagingInstance) {
      console.error('Messaging not available');
      return null;
    }

    try {
      // Delete the old token
      await deleteToken(this.messagingInstance);

      // Get a new token
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.error('VAPID key not configured');
        return null;
      }

      const newToken = await getToken(this.messagingInstance, { vapidKey });

      if (newToken) {
        // Notify callback if registered
        if (this.tokenRefreshCallback) {
          this.tokenRefreshCallback(newToken);
        }
      }

      return newToken;
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
      return null;
    }
  }
}
