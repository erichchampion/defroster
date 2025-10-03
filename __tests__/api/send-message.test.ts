// Create mock functions that will be reused
const mockSaveMessage = jest.fn();
const mockGetDevicesInRadius = jest.fn();
const mockInitialize = jest.fn();

// Create a mock data service instance
const mockDataService = {
  saveMessage: mockSaveMessage,
  getDevicesInRadius: mockGetDevicesInRadius,
  initialize: mockInitialize,
};

jest.mock('@/lib/services/data-service-singleton', () => ({
  getDataService: jest.fn(() => mockDataService),
  resetDataService: jest.fn(),
  setDataService: jest.fn(),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminMessaging: null,
}));

jest.mock('geofire-common', () => ({
  geohashForLocation: jest.fn(() => 'mock_geohash'),
}));

jest.mock('@/lib/middleware/rate-limit', () => ({
  applyRateLimit: jest.fn(() => null), // Return null means no rate limit error
  RATE_LIMITS: {
    SEND_MESSAGE: { requests: 10, window: 60000 },
    REGISTER_DEVICE: { requests: 5, window: 60000 },
    GET_MESSAGES: { requests: 20, window: 60000 },
  },
}));

jest.mock('@/lib/middleware/auth', () => ({
  validateApiKey: jest.fn(() => null), // Return null means valid API key
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      return {
        json: async () => data,
        status: init?.status || 200,
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      };
    }),
  },
}));

import { POST } from '@/app/api/send-message/route';
import { adminMessaging } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';
import { resetDataService } from '@/lib/services/data-service-singleton';

// Helper to create mock NextRequest
function createMockRequest(body: any) {
  return {
    json: async () => body,
    headers: {
      get: (key: string) => {
        if (key === 'x-api-key') {
          return process.env.API_SECRET_KEY || 'test-api-key';
        }
        return null;
      },
    },
  } as any;
}

describe('POST /api/send-message', () => {
  beforeAll(() => {
    // Set API key for tests
    process.env.API_SECRET_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset data service singleton
    (resetDataService as jest.Mock).mockClear();

    // Reset mock implementations
    mockSaveMessage.mockResolvedValue('message_123');
    mockGetDevicesInRadius.mockResolvedValue([]);
  });

  describe('Validation', () => {
    it('should reject request without sighting location', async () => {
      const request = createMockRequest({
        sightingType: 'ICE',
        timestamp: Date.now(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid sighting location is required');
    });

    it('should reject request with invalid sighting type', async () => {
      const request = createMockRequest({
        sightingType: 'INVALID',
        location: { latitude: 37.7849, longitude: -122.4294 },
        timestamp: Date.now(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Valid sighting type is required (ICE, Army, or Police)');
    });
  });

  describe('Message Creation', () => {
    it('should successfully save a sighting', async () => {
      const request = createMockRequest({
        sightingType: 'ICE',
        location: { latitude: 37.7849, longitude: -122.4294 },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('message_123');
      expect(mockSaveMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sightingType: 'ICE',
          location: { latitude: 37.7849, longitude: -122.4294 },
          geohash: 'mock_geohash',
        })
      );
    });

    it('should use server timestamp', async () => {
      const beforeTimestamp = Date.now();

      const request = createMockRequest({
        sightingType: 'Police',
        location: { latitude: 37.7849, longitude: -122.4294 },
      });

      await POST(request);

      const afterTimestamp = Date.now();
      const callArgs = mockSaveMessage.mock.calls[0][0];

      expect(callArgs.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(callArgs.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });

  describe('Device Notification', () => {
    it('should query for devices within 5-mile radius', async () => {
      const location = { latitude: 37.7849, longitude: -122.4294 };
      const request = createMockRequest({
        sightingType: 'Army',
        location,
      });

      await POST(request);

      expect(mockGetDevicesInRadius).toHaveBeenCalledWith(location, 5);
    });

    it('should return count of notified devices', async () => {
      mockGetDevicesInRadius.mockResolvedValue([
        { deviceId: 'device1', token: 'token1', geohash: 'hash1', updatedAt: Date.now() },
        { deviceId: 'device2', token: 'token2', geohash: 'hash2', updatedAt: Date.now() },
      ] as any);

      const request = createMockRequest({
        sightingType: 'Police',
        location: { latitude: 37.7849, longitude: -122.4294 },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.notifiedDevices).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database save fails', async () => {
      mockSaveMessage.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        sightingType: 'ICE',
        location: { latitude: 37.7849, longitude: -122.4294 },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 500 when getDevicesInRadius fails', async () => {
      mockGetDevicesInRadius.mockRejectedValue(new Error('Query error'));

      const request = createMockRequest({
        sightingType: 'Police',
        location: { latitude: 37.7849, longitude: -122.4294 },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
