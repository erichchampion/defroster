import { Message, GeoLocation } from '@/lib/types/message';
import { ILocalStorageService } from '@/lib/abstractions/local-storage-service';
import { distanceBetween } from 'geofire-common';

const DB_NAME = 'DefrosterDB';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';

export class IndexedDBStorageService implements ILocalStorageService {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      console.warn('IndexedDB only available in browser');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create messages object store if it doesn't exist
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messageStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });

          // Create indexes for efficient querying
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
          messageStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          messageStore.createIndex('sightingType', 'sightingType', { unique: false });
          messageStore.createIndex('latitude', 'location.latitude', { unique: false });
          messageStore.createIndex('longitude', 'location.longitude', { unique: false });

          console.log('Created messages object store with indexes');
        }
      };
    });
  }

  async saveMessage(message: Message): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);

      // Ensure message has an ID
      const messageToSave = {
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const request = store.put(messageToSave);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to save message:', request.error);
        reject(request.error);
      };
    });
  }

  async saveMessages(messages: Message[]): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);

      let completed = 0;
      let hasError = false;

      messages.forEach((message) => {
        const messageToSave = {
          ...message,
          id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        const request = store.put(messageToSave);

        request.onsuccess = () => {
          completed++;
          if (completed === messages.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          hasError = true;
          console.error('Failed to save message:', request.error);
          reject(request.error);
        };
      });

      // Handle empty array case
      if (messages.length === 0) {
        resolve();
      }
    });
  }

  async getMessagesInRadius(location: GeoLocation, radiusMiles: number): Promise<Message[]> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allMessages = request.result as Message[];
        const now = Date.now();

        // Filter by distance and expiration
        const nearbyMessages = allMessages.filter((message) => {
          // Skip expired messages
          if (message.expiresAt < now) {
            return false;
          }

          // Calculate distance
          const distance = distanceBetween(
            [location.latitude, location.longitude],
            [message.location.latitude, message.location.longitude]
          );

          // Convert km to miles
          const distanceMiles = distance * 0.621371;

          return distanceMiles <= radiusMiles;
        });

        // Sort by timestamp (newest first)
        nearbyMessages.sort((a, b) => b.timestamp - a.timestamp);

        resolve(nearbyMessages);
      };

      request.onerror = () => {
        console.error('Failed to get messages:', request.error);
        reject(request.error);
      };
    });
  }

  async getAllMessages(): Promise<Message[]> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const messages = request.result as Message[];
        // Sort by timestamp (newest first)
        messages.sort((a, b) => b.timestamp - a.timestamp);
        resolve(messages);
      };

      request.onerror = () => {
        console.error('Failed to get all messages:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteMessage(id: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete message:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteExpiredMessages(): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('expiresAt');
      const now = Date.now();

      // Get all messages that have expired
      const request = index.openCursor(IDBKeyRange.upperBound(now));
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          // No more expired messages
          console.log(`Deleted ${deletedCount} expired messages from IndexedDB`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Failed to delete expired messages:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Cleared all messages from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear messages:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete messages older than the specified age (in milliseconds)
   * @param maxAgeMs Maximum age in milliseconds (default: 1 week)
   * @returns Number of messages deleted
   */
  async deleteOldMessages(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('timestamp');

      const cutoffTime = Date.now() - maxAgeMs;

      // Get all messages older than the cutoff time
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          // No more old messages
          if (deletedCount > 0) {
            console.log(`Deleted ${deletedCount} old messages from IndexedDB (older than ${Math.floor(maxAgeMs / (24 * 60 * 60 * 1000))} days)`);
          }
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Failed to delete old messages:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete messages older than one week
   * @returns Number of messages deleted
   */
  async deleteMessagesOlderThanOneWeek(): Promise<number> {
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    return this.deleteOldMessages(ONE_WEEK_MS);
  }
}
