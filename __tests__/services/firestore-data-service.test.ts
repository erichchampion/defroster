import { FirestoreDataService } from '@/lib/services/firestore-data-service';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween, geohashForLocation } from 'geofire-common';

// Mock Firebase and geofire
jest.mock('firebase/firestore');
jest.mock('geofire-common');
jest.mock('@/lib/firebase/config', () => ({
  db: {},
}));

describe('FirestoreDataService', () => {
  let service: FirestoreDataService;
  let mockCollection: jest.Mock;
  let mockAddDoc: jest.Mock;
  let mockQuery: jest.Mock;
  let mockWhere: jest.Mock;
  let mockGetDocs: jest.Mock;
  let mockDeleteDoc: jest.Mock;
  let mockDoc: jest.Mock;
  let mockSetDoc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new FirestoreDataService();

    mockCollection = collection as jest.Mock;
    mockAddDoc = addDoc as jest.Mock;
    mockQuery = query as jest.Mock;
    mockWhere = where as jest.Mock;
    mockGetDocs = getDocs as jest.Mock;
    mockDeleteDoc = deleteDoc as jest.Mock;
    mockDoc = doc as jest.Mock;
    mockSetDoc = setDoc as jest.Mock;

    // Setup default mocks
    (geohashForLocation as jest.Mock).mockReturnValue('mock_geohash');
    (Timestamp.fromMillis as jest.Mock).mockImplementation((ms) => ({
      toMillis: () => ms,
    }));
    (Timestamp.now as jest.Mock).mockReturnValue({
      toMillis: () => Date.now(),
    });
  });

  describe('saveMessage', () => {
    it('should save a message and return document ID', async () => {
      mockAddDoc.mockResolvedValue({ id: 'message_123' });
      mockCollection.mockReturnValue('messages_collection');

      const message = {
        sightingType: 'ICE' as const,
        location: { latitude: 37.7749, longitude: -122.4194 },
        timestamp: Date.now(),
        geohash: 'mock_geohash',
        expiresAt: Date.now() + 3600000,
      };

      const messageId = await service.saveMessage(message);

      expect(messageId).toBe('message_123');
      expect(mockAddDoc).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith({}, 'messages');
    });

    it('should convert timestamps correctly', async () => {
      mockAddDoc.mockResolvedValue({ id: 'message_123' });
      mockCollection.mockReturnValue('messages_collection');

      const timestamp = Date.now();
      const expiresAt = timestamp + 3600000;

      const message = {
        sightingType: 'Army' as const,
        location: { latitude: 37.7749, longitude: -122.4194 },
        timestamp,
        geohash: 'hash',
        expiresAt,
      };

      await service.saveMessage(message);

      expect(Timestamp.fromMillis).toHaveBeenCalledWith(timestamp);
      expect(Timestamp.fromMillis).toHaveBeenCalledWith(expiresAt);
    });
  });

  describe('getMessagesInRadius', () => {
    it('should query messages within radius', async () => {
      const bounds = [
        ['bound1_start', 'bound1_end'],
      ];
      (geohashQueryBounds as jest.Mock).mockReturnValue(bounds);

      const mockDocs = [
        {
          id: 'msg1',
          data: () => ({
            sightingType: 'ICE',
            location: { latitude: 37.7749, longitude: -122.4194 },
            timestamp: { toMillis: () => Date.now() },
            expiresAt: { toMillis: () => Date.now() + 3600000 },
            geohash: 'hash1',
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs });
      (distanceBetween as jest.Mock).mockReturnValue(1.0); // 1 km = ~0.62 miles

      const messages = await service.getMessagesInRadius(
        { latitude: 37.7749, longitude: -122.4194 },
        5
      );

      expect(geohashQueryBounds).toHaveBeenCalledWith(
        [37.7749, -122.4194],
        5 * 1.60934 * 1000
      );
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg1');
    });

    it('should filter out messages beyond radius', async () => {
      const bounds = [['bound1_start', 'bound1_end']];
      (geohashQueryBounds as jest.Mock).mockReturnValue(bounds);

      const mockDocs = [
        {
          id: 'msg1',
          data: () => ({
            sightingType: 'Police',
            location: { latitude: 37.7749, longitude: -122.4194 },
            timestamp: { toMillis: () => Date.now() },
            expiresAt: { toMillis: () => Date.now() + 3600000 },
            geohash: 'hash1',
          }),
        },
        {
          id: 'msg2',
          data: () => ({
            sightingType: 'Army',
            location: { latitude: 40.7128, longitude: -74.006 },
            timestamp: { toMillis: () => Date.now() },
            expiresAt: { toMillis: () => Date.now() + 3600000 },
            geohash: 'hash2',
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      // First message is close, second is far
      (distanceBetween as jest.Mock)
        .mockReturnValueOnce(1.0) // ~0.62 miles
        .mockReturnValueOnce(5000); // ~3107 miles

      const messages = await service.getMessagesInRadius(
        { latitude: 37.7749, longitude: -122.4194 },
        5
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg1');
    });
  });

  describe('deleteExpiredMessages', () => {
    it('should delete expired messages and return count', async () => {
      const mockDocs = [
        { id: 'msg1' },
        { id: 'msg2' },
        { id: 'msg3' },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs, size: 3 });
      mockDeleteDoc.mockResolvedValue(undefined);

      const count = await service.deleteExpiredMessages();

      expect(count).toBe(3);
      expect(mockDeleteDoc).toHaveBeenCalledTimes(3);
    });

    it('should query with current timestamp', async () => {
      mockGetDocs.mockResolvedValue({ docs: [], size: 0 });

      await service.deleteExpiredMessages();

      expect(Timestamp.now).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('expiresAt', '<=', expect.anything());
    });
  });

  describe('registerDevice', () => {
    it('should register a device with deviceId', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      mockDoc.mockReturnValue('device_doc');

      const device = {
        deviceId: 'device_123',
        token: 'fcm_token_123',
        geohash: 'mock_geohash',
        updatedAt: Date.now(),
      };

      await service.registerDevice(device);

      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockDoc).toHaveBeenCalledWith({}, 'devices', 'device_123');
    });
  });

  describe('getDevicesInRadius', () => {
    it('should return devices within radius', async () => {
      const bounds = [['bound1_start', 'bound1_end']];
      (geohashQueryBounds as jest.Mock).mockReturnValue(bounds);

      const mockDocs = [
        {
          data: () => ({
            deviceId: 'device1',
            token: 'token1',
            geohash: 'hash1',
            updatedAt: { toMillis: () => Date.now() },
          }),
        },
        {
          data: () => ({
            deviceId: 'device2',
            token: 'token2',
            geohash: 'hash2',
            updatedAt: { toMillis: () => Date.now() },
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs });
      (distanceBetween as jest.Mock).mockReturnValue(1.0);

      const devices = await service.getDevicesInRadius(
        { latitude: 37.7749, longitude: -122.4194 },
        5
      );

      expect(devices).toHaveLength(2);
      expect(devices[0].deviceId).toBe('device1');
      expect(devices[0].token).toBe('token1');
      expect(devices[1].deviceId).toBe('device2');
      expect(devices[1].token).toBe('token2');
    });

    it('should query devices using geohash bounds', async () => {
      const bounds = [['bound1_start', 'bound1_end']];
      (geohashQueryBounds as jest.Mock).mockReturnValue(bounds);

      const mockDocs = [
        {
          data: () => ({
            deviceId: 'device1',
            token: 'token1',
            geohash: 'hash1',
            updatedAt: { toMillis: () => Date.now() },
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs });

      const devices = await service.getDevicesInRadius(
        { latitude: 37.7749, longitude: -122.4194 },
        5
      );

      expect(devices).toHaveLength(1);
      expect(devices[0].deviceId).toBe('device1');
    });
  });

  describe('updateDeviceLocation', () => {
    it('should update device geohash with merge', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      mockDoc.mockReturnValue('device_doc');
      (geohashForLocation as jest.Mock).mockReturnValue('new_geohash');

      await service.updateDeviceLocation('device_123', {
        latitude: 37.7850,
        longitude: -122.4094,
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        'device_doc',
        expect.objectContaining({
          geohash: 'new_geohash',
        }),
        { merge: true }
      );
      expect(mockDoc).toHaveBeenCalledWith({}, 'devices', 'device_123');
    });
  });

  describe('removeDevice', () => {
    it('should delete device by deviceId', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);
      mockDoc.mockReturnValue('device_doc');

      await service.removeDevice('device_123');

      expect(mockDeleteDoc).toHaveBeenCalledWith('device_doc');
      expect(mockDoc).toHaveBeenCalledWith({}, 'devices', 'device_123');
    });
  });
});
