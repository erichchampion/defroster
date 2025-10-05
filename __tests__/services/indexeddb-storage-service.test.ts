import { IndexedDBStorageService } from '@/lib/services/indexeddb-storage-service';
import { Message, GeoLocation } from '@/lib/types/message';
import { AppState } from '@/lib/types/app-state';
import { ONE_WEEK_MS, ONE_DAY_MS } from '@/lib/constants/time';

describe('IndexedDBStorageService', () => {
  let service: IndexedDBStorageService;
  let mockDB: any;
  let mockObjectStore: any;
  let mockTransaction: any;
  let mockRequest: any;
  let mockCursor: any;

  beforeEach(() => {
    service = new IndexedDBStorageService();

    // Mock IDBObjectStore
    mockObjectStore = {
      add: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      openCursor: jest.fn(),
      getAll: jest.fn(),
      createIndex: jest.fn(),
    };

    // Mock IDBTransaction
    mockTransaction = {
      objectStore: jest.fn(() => mockObjectStore),
      oncomplete: null,
      onerror: null,
    };

    // Mock IDBDatabase
    mockDB = {
      transaction: jest.fn(() => mockTransaction),
      createObjectStore: jest.fn(() => mockObjectStore),
      objectStoreNames: {
        contains: jest.fn(() => false),
      },
    };

    // Mock IDBRequest
    mockRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDB,
    };

    // Mock cursor
    mockCursor = {
      value: null,
      continue: jest.fn(),
    };

    // Mock indexedDB
    global.indexedDB = {
      open: jest.fn(() => mockRequest),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the database successfully', async () => {
      const initPromise = service.initialize();

      // Simulate successful database opening
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);

      await expect(initPromise).resolves.toBeUndefined();
      expect(global.indexedDB.open).toHaveBeenCalledWith('DefrosterDB', 3);
    });

    it('should create object store on upgrade', async () => {
      const initPromise = service.initialize();

      // Simulate database upgrade
      setTimeout(() => {
        if (mockRequest.onupgradeneeded) {
          mockRequest.onupgradeneeded({ target: mockRequest } as any);
        }
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);

      await initPromise;

      expect(mockDB.createObjectStore).toHaveBeenCalledWith('messages', { keyPath: 'id' });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith('timestamp', 'timestamp', { unique: false });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith('expiresAt', 'expiresAt', { unique: false });
      expect(mockObjectStore.createIndex).toHaveBeenCalledWith('sightingType', 'sightingType', { unique: false });
    });

    it('should handle initialization errors', async () => {
      const initPromise = service.initialize();

      // Simulate error - need to set the error and then call onerror
      setTimeout(() => {
        mockRequest.error = new Error('DB Error');
        if (mockRequest.onerror) {
          mockRequest.onerror();
        }
      }, 0);

      await expect(initPromise).rejects.toBeTruthy();
    });
  });

  describe('saveMessage', () => {
    const mockMessage: Message = {
      id: 'msg_1',
      sightingType: 'ICE',
      location: { latitude: 37.7849, longitude: -122.4294 },
      timestamp: Date.now(),
      geohash: 'hash1',
      expiresAt: Date.now() + 3600000,
    };

    beforeEach(async () => {
      // Initialize first
      const initPromise = service.initialize();
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);
      await initPromise;
    });

    it('should save a message successfully', async () => {
      const putRequest = { onsuccess: null, onerror: null, result: undefined };
      mockObjectStore.put.mockReturnValue(putRequest);

      const savePromise = service.saveMessage(mockMessage);

      setTimeout(() => {
        if (putRequest.onsuccess) {
          putRequest.onsuccess({} as any);
        }
      }, 0);

      await expect(savePromise).resolves.toBeUndefined();
      expect(mockDB.transaction).toHaveBeenCalledWith(['messages'], 'readwrite');
      expect(mockObjectStore.put).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle save errors', async () => {
      const putRequest = { onsuccess: null, onerror: null, result: undefined, error: undefined };
      mockObjectStore.put.mockReturnValue(putRequest);

      const savePromise = service.saveMessage(mockMessage);

      setTimeout(() => {
        putRequest.error = new Error('Put failed');
        if (putRequest.onerror) {
          putRequest.onerror();
        }
      }, 0);

      await expect(savePromise).rejects.toBeTruthy();
    });
  });

  describe('saveMessages', () => {
    const mockMessages: Message[] = [
      {
        id: 'msg_1',
        sightingType: 'ICE',
        location: { latitude: 37.7849, longitude: -122.4294 },
        timestamp: Date.now(),
        geohash: 'hash1',
        expiresAt: Date.now() + 3600000,
      },
      {
        id: 'msg_2',
        sightingType: 'Police',
        location: { latitude: 37.7850, longitude: -122.4295 },
        timestamp: Date.now(),
        geohash: 'hash2',
        expiresAt: Date.now() + 3600000,
      },
    ];

    beforeEach(async () => {
      const initPromise = service.initialize();
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);
      await initPromise;
    });

    it('should save multiple messages successfully', async () => {
      const putRequest = { onsuccess: null, onerror: null, result: undefined };
      mockObjectStore.put.mockReturnValue(putRequest);

      const savePromise = service.saveMessages(mockMessages);

      // Simulate each put operation succeeding
      setTimeout(() => {
        if (putRequest.onsuccess) {
          putRequest.onsuccess({} as any);
          putRequest.onsuccess({} as any);
        }
        if (mockTransaction.oncomplete) {
          mockTransaction.oncomplete({} as any);
        }
      }, 0);

      await expect(savePromise).resolves.toBeUndefined();
      expect(mockObjectStore.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllMessages', () => {
    beforeEach(async () => {
      const initPromise = service.initialize();
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);
      await initPromise;
    });

    it('should retrieve all messages', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg_1',
          sightingType: 'Army',
          location: { latitude: 37.7849, longitude: -122.4294 },
          timestamp: Date.now(),
          geohash: 'hash1',
          expiresAt: Date.now() + 3600000,
        },
      ];

      const getAllRequest = { onsuccess: null, onerror: null, result: mockMessages };
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const getPromise = service.getAllMessages();

      setTimeout(() => {
        if (getAllRequest.onsuccess) {
          getAllRequest.onsuccess({ target: getAllRequest } as any);
        }
      }, 0);

      const result = await getPromise;
      expect(result).toEqual(mockMessages);
    });
  });

  describe('deleteExpiredMessages', () => {
    beforeEach(async () => {
      const initPromise = service.initialize();
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);
      await initPromise;
    });

    it('should delete expired messages and return count', async () => {
      const expiredMessages = [
        {
          id: 'msg_expired_1',
          sightingType: 'ICE' as const,
          location: { latitude: 37.7849, longitude: -122.4294 },
          timestamp: Date.now() - 7200000,
          geohash: 'hash1',
          expiresAt: Date.now() - 3600000, // Expired 1 hour ago
        },
        {
          id: 'msg_expired_2',
          sightingType: 'Police' as const,
          location: { latitude: 37.7850, longitude: -122.4295 },
          timestamp: Date.now() - 7200000,
          geohash: 'hash2',
          expiresAt: Date.now() - 1800000, // Expired 30 min ago
        },
      ];

      // Mock index
      const mockIndex = {
        openCursor: jest.fn(),
      };

      mockObjectStore.index = jest.fn(() => mockIndex);

      const cursorRequest = { onsuccess: null, onerror: null, result: null };
      mockIndex.openCursor.mockReturnValue(cursorRequest);

      const deleteRequest = { onsuccess: null, onerror: null };
      mockObjectStore.delete.mockReturnValue(deleteRequest);

      const deletePromise = service.deleteExpiredMessages();

      setTimeout(() => {
        // Simulate cursor iteration
        let callCount = 0;
        const simulateCursor = () => {
          if (callCount < expiredMessages.length) {
            cursorRequest.result = {
              value: expiredMessages[callCount],
              delete: jest.fn(() => {
                if (deleteRequest.onsuccess) {
                  deleteRequest.onsuccess({} as any);
                }
              }),
              continue: jest.fn(() => {
                callCount++;
                setTimeout(simulateCursor, 0);
              }),
            };
            if (cursorRequest.onsuccess) {
              cursorRequest.onsuccess({ target: cursorRequest } as any);
            }
          } else {
            cursorRequest.result = null;
            if (cursorRequest.onsuccess) {
              cursorRequest.onsuccess({ target: cursorRequest } as any);
            }
          }
        };
        simulateCursor();
      }, 0);

      const count = await deletePromise;
      expect(count).toBe(2);
    });
  });

  describe('clearAll', () => {
    beforeEach(async () => {
      const initPromise = service.initialize();
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);
      await initPromise;
    });

    it('should clear all messages', async () => {
      const clearRequest = { onsuccess: null, onerror: null };
      mockObjectStore.clear.mockReturnValue(clearRequest);

      const clearPromise = service.clearAll();

      setTimeout(() => {
        if (clearRequest.onsuccess) {
          clearRequest.onsuccess({} as any);
        }
      }, 0);

      await expect(clearPromise).resolves.toBeUndefined();
      expect(mockObjectStore.clear).toHaveBeenCalled();
    });
  });

  describe('App State Persistence', () => {
    beforeEach(async () => {
      // Initialize the service before each test
      const initPromise = service.initialize();
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: mockRequest } as any);
        }
      }, 0);
      await initPromise;
    });

    describe('saveAppState', () => {
      it('should save app state to IndexedDB', async () => {
        const putRequest = { onsuccess: null, onerror: null };
        mockObjectStore.put.mockReturnValue(putRequest);

        const appState: Partial<AppState> = {
          lastKnownLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
            timestamp: Date.now(),
          },
          locationPermissionGranted: true,
          appInitialized: true,
        };

        const savePromise = service.saveAppState(appState);

        setTimeout(() => {
          if (putRequest.onsuccess) {
            putRequest.onsuccess({} as any);
          }
        }, 0);

        await expect(savePromise).resolves.toBeUndefined();
        expect(mockObjectStore.put).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'app_state',
            ...appState,
            updatedAt: expect.any(Number),
          })
        );
      });

      it('should handle save errors gracefully', async () => {
        const putRequest = { onsuccess: null, onerror: null, error: new Error('Save failed') };
        mockObjectStore.put.mockReturnValue(putRequest);

        const appState: Partial<AppState> = {
          appInitialized: true,
        };

        const savePromise = service.saveAppState(appState);

        setTimeout(() => {
          if (putRequest.onerror) {
            putRequest.onerror({} as any);
          }
        }, 0);

        await expect(savePromise).rejects.toEqual(new Error('Save failed'));
      });

      it('should initialize database if not already initialized', async () => {
        const openRequest = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB };
        (global.indexedDB.open as jest.Mock).mockReturnValue(openRequest);

        const putRequest = { onsuccess: null, onerror: null };
        mockObjectStore.put.mockReturnValue(putRequest);

        const appState: Partial<AppState> = { appInitialized: true };
        const savePromise = service.saveAppState(appState);

        setTimeout(() => {
          if (openRequest.onsuccess) {
            openRequest.onsuccess({ target: openRequest } as any);
          }
        }, 0);

        setTimeout(() => {
          if (putRequest.onsuccess) {
            putRequest.onsuccess({} as any);
          }
        }, 10);

        await expect(savePromise).resolves.toBeUndefined();
      });
    });

    describe('getAppState', () => {
      it('should retrieve app state from IndexedDB', async () => {
        const getRequest = { onsuccess: null, onerror: null, result: null };
        mockObjectStore.get = jest.fn().mockReturnValue(getRequest);

        const savedState: AppState = {
          lastKnownLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
            timestamp: Date.now(),
          },
          locationPermissionGranted: true,
          notificationPermissionGranted: true,
          deviceRegistered: true,
          lastDeviceRegistrationTime: Date.now(),
          appInitialized: true,
          lastActiveTimestamp: Date.now(),
          updatedAt: Date.now(),
        };

        const getPromise = service.getAppState();

        setTimeout(() => {
          getRequest.result = savedState;
          if (getRequest.onsuccess) {
            getRequest.onsuccess({ target: getRequest } as any);
          }
        }, 0);

        const result = await getPromise;
        expect(result).toEqual(savedState);
        expect(mockObjectStore.get).toHaveBeenCalledWith('app_state');
      });

      it('should return null if no state exists', async () => {
        const getRequest = { onsuccess: null, onerror: null, result: null };
        mockObjectStore.get = jest.fn().mockReturnValue(getRequest);

        const getPromise = service.getAppState();

        setTimeout(() => {
          getRequest.result = null;
          if (getRequest.onsuccess) {
            getRequest.onsuccess({ target: getRequest } as any);
          }
        }, 0);

        const result = await getPromise;
        expect(result).toBeNull();
      });

      it('should return null if state is stale (older than 7 days)', async () => {
        const getRequest = { onsuccess: null, onerror: null, result: null };
        mockObjectStore.get = jest.fn().mockReturnValue(getRequest);

        const staleState: AppState = {
          lastKnownLocation: null,
          locationPermissionGranted: false,
          notificationPermissionGranted: false,
          deviceRegistered: false,
          lastDeviceRegistrationTime: 0,
          appInitialized: false,
          lastActiveTimestamp: 0,
          updatedAt: Date.now() - (ONE_WEEK_MS + ONE_DAY_MS), // 1 day past TTL
        };

        const getPromise = service.getAppState();

        setTimeout(() => {
          getRequest.result = staleState;
          if (getRequest.onsuccess) {
            getRequest.onsuccess({ target: getRequest } as any);
          }
        }, 0);

        const result = await getPromise;
        expect(result).toBeNull();
      });

      it('should handle get errors gracefully', async () => {
        const getRequest = { onsuccess: null, onerror: null, result: null };
        mockObjectStore.get = jest.fn().mockReturnValue(getRequest);

        const getPromise = service.getAppState();

        setTimeout(() => {
          if (getRequest.onerror) {
            getRequest.onerror({ target: { error: new Error('Get failed') } } as any);
          }
        }, 0);

        const result = await getPromise;
        expect(result).toBeNull();
      });
    });

    describe('clearAppState', () => {
      it('should clear app state from IndexedDB', async () => {
        const deleteRequest = { onsuccess: null, onerror: null };
        mockObjectStore.delete.mockReturnValue(deleteRequest);

        const clearPromise = service.clearAppState();

        setTimeout(() => {
          if (deleteRequest.onsuccess) {
            deleteRequest.onsuccess({} as any);
          }
        }, 0);

        await expect(clearPromise).resolves.toBeUndefined();
        expect(mockObjectStore.delete).toHaveBeenCalledWith('app_state');
      });

      it('should handle clear errors gracefully', async () => {
        const deleteRequest = { onsuccess: null, onerror: null, error: new Error('Delete failed') };
        mockObjectStore.delete.mockReturnValue(deleteRequest);

        const clearPromise = service.clearAppState();

        setTimeout(() => {
          if (deleteRequest.onerror) {
            deleteRequest.onerror({} as any);
          }
        }, 0);

        await expect(clearPromise).rejects.toEqual(new Error('Delete failed'));
      });
    });
  });
});
