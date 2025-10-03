import { render, screen } from '@testing-library/react';
import SightingMap from '@/app/components/SightingMap';
import { Message } from '@/lib/types/message';
import { I18nProvider } from '@/lib/contexts/I18nContext';

// Helper to render with I18n provider
const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

// Mock Leaflet and react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  Circle: () => <div data-testid="circle" />,
  useMap: () => ({
    setView: jest.fn(),
    getZoom: jest.fn(() => 13),
  }),
}));

jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(() => ({})),
}));

describe('SightingMap', () => {
  const mockCurrentLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  const mockMessages: Message[] = [
    {
      id: 'msg_1',
      sightingType: 'ICE',
      location: { latitude: 37.7849, longitude: -122.4294 },
      timestamp: Date.now() - 600000, // 10 minutes ago
      geohash: 'hash1',
      expiresAt: Date.now() + 3000000,
    },
    {
      id: 'msg_2',
      sightingType: 'Army',
      location: { latitude: 37.7850, longitude: -122.4295 },
      timestamp: Date.now() - 1800000, // 30 minutes ago
      geohash: 'hash2',
      expiresAt: Date.now() + 2400000,
    },
    {
      id: 'msg_3',
      sightingType: 'Police',
      location: { latitude: 37.7851, longitude: -122.4296 },
      timestamp: Date.now() - 3600000, // 1 hour ago
      senderLocation: { latitude: 37.7751, longitude: -122.4196 },
      geohash: 'hash3',
      expiresAt: Date.now() + 600000,
    },
  ];

  describe('Rendering', () => {
    it('should render the map container', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should render tile layer', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const tileLayer = screen.getByTestId('tile-layer');
      expect(tileLayer).toBeInTheDocument();
    });

    it('should render circle for 5-mile radius', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const circle = screen.getByTestId('circle');
      expect(circle).toBeInTheDocument();
    });

    it('should render current location marker', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const markers = screen.getAllByTestId('marker');
      expect(markers.length).toBeGreaterThan(0);

      // Current location popup
      expect(screen.getByText('Your Location')).toBeInTheDocument();
    });
  });

  describe('Sighting Markers', () => {
    it('should render marker for each sighting', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      const markers = screen.getAllByTestId('marker');
      // 1 for current location + 3 for sightings
      expect(markers).toHaveLength(4);
    });

    it('should display ICE sighting information', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      expect(screen.getByText('ICE')).toBeInTheDocument();
    });

    it('should display Army sighting information', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      expect(screen.getByText('Army')).toBeInTheDocument();
    });

    it('should display Police sighting information', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      expect(screen.getByText('Police')).toBeInTheDocument();
    });

    it('should display relative time for recent sightings', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      // Should show time ago indicators (i18n format)
      expect(screen.getByText(/10 minutes ago/)).toBeInTheDocument();
      expect(screen.getByText(/30 minutes ago/)).toBeInTheDocument();
      expect(screen.getByText(/1 hour ago/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render map with no sighting markers when messages array is empty', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const markers = screen.getAllByTestId('marker');
      // Only current location marker
      expect(markers).toHaveLength(1);
    });
  });

  describe('Location Updates', () => {
    it('should update when current location changes', () => {
      const { rerender } = renderWithI18n(
        <SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />
      );

      const newLocation = {
        latitude: 37.8000,
        longitude: -122.4500,
      };

      rerender(<I18nProvider><SightingMap messages={mockMessages} currentLocation={newLocation} /></I18nProvider>);

      // Map should still render with new location
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should update when messages change', () => {
      const { rerender } = renderWithI18n(
        <SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />
      );

      const newMessages: Message[] = [
        {
          id: 'msg_new',
          sightingType: 'ICE',
          location: { latitude: 37.7900, longitude: -122.4300 },
          timestamp: Date.now(),
              geohash: 'hash_new',
          expiresAt: Date.now() + 3600000,
        },
      ];

      rerender(<I18nProvider><SightingMap messages={newMessages} currentLocation={mockCurrentLocation} /></I18nProvider>);

      const markers = screen.getAllByTestId('marker');
      // 1 current location + 1 new sighting
      expect(markers).toHaveLength(2);
    });
  });
});
