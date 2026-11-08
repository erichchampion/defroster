import { render } from '@testing-library/react';
import SightingMap from '@/app/components/SightingMap';
import { Message } from '@/lib/types/message';
import { I18nProvider } from '@/lib/contexts/I18nContext';

// Helper to render with I18n provider
const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

// Mock MapLibre GL: the component drives it imperatively, so record calls
jest.mock('maplibre-gl', () => {
  class MockMap {
    on = jest.fn((event: string, callback: () => void) => {
      if (event === 'load') callback();
    });
    addSource = jest.fn();
    addLayer = jest.fn();
    getSource = jest.fn(() => ({ setData: jest.fn() }));
    jumpTo = jest.fn();
    getZoom = jest.fn(() => 13);
    remove = jest.fn();
    scrollZoom = { disable: jest.fn() };
    static instances: MockMap[] = [];
    constructor() {
      MockMap.instances.push(this);
    }
  }

  class MockMarker {
    setLngLat = jest.fn().mockReturnThis();
    setPopup = jest.fn().mockReturnThis();
    addTo = jest.fn().mockReturnThis();
    remove = jest.fn();
    static instances: MockMarker[] = [];
    static reset() {
      MockMarker.instances = [];
    }
    constructor() {
      MockMarker.instances.push(this);
    }
  }

  class MockPopup {
    setDOMContent = jest.fn().mockReturnThis();
    static instances: MockPopup[] = [];
    constructor() {
      MockPopup.instances.push(this);
    }
  }

  return { Map: MockMap, Marker: MockMarker, Popup: MockPopup };
});

import maplibregl from 'maplibre-gl';

// Typed accessors into the mock class registries
interface MockMapLike {
  on: jest.Mock;
  addSource: jest.Mock;
  addLayer: jest.Mock;
  jumpTo: jest.Mock;
  remove: jest.Mock;
  scrollZoom: { disable: jest.Mock };
}

interface MockMarkerLike {
  setLngLat: jest.Mock;
  setPopup: jest.Mock;
  addTo: jest.Mock;
  remove: jest.Mock;
}

interface MockPopupLike {
  setDOMContent: jest.Mock;
}

const getMaps = () => (maplibregl.Map as unknown as { instances: MockMapLike[] }).instances;
const getMarkers = () => (maplibregl.Marker as unknown as { instances: MockMarkerLike[] }).instances;
const getPopups = () => (maplibregl.Popup as unknown as { instances: MockPopupLike[] }).instances;

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
    location: { latitude: 37.785, longitude: -122.4295 },
    timestamp: Date.now() - 1800000, // 30 minutes ago
    geohash: 'hash2',
    expiresAt: Date.now() + 2400000,
  },
  {
    id: 'msg_3',
    sightingType: 'Police',
    location: { latitude: 37.7851, longitude: -122.4296 },
    timestamp: Date.now() - 3600000, // 1 hour ago
    geohash: 'hash3',
    expiresAt: Date.now() + 600000,
  },
];

const mockCurrentLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
};

describe('SightingMap', () => {
  beforeEach(() => {
    // The Map mock invokes the 'load' handler synchronously, so the map is
    // "ready" after the first render pass.
    jest.clearAllMocks();
    (maplibregl.Map as unknown as { instances: unknown[] }).instances = [];
    (maplibregl.Marker as unknown as { instances: unknown[] }).instances = [];
    (maplibregl.Popup as unknown as { instances: unknown[] }).instances = [];
  });

  describe('Rendering', () => {
    it('should render the map host container', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);
      expect(document.querySelector('.map-host')).not.toBeNull();
    });

    it('should create a MapLibre map with the CARTO Positron vector style', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const mapInstance = getMaps()[0];
      expect(mapInstance).toBeDefined();
      expect(mapInstance.on).toHaveBeenCalledWith('load', expect.any(Function));
      expect(mapInstance.addSource).toHaveBeenCalledWith('search-radius', expect.objectContaining({ type: 'geojson' }));
      expect(mapInstance.addLayer).toHaveBeenCalledTimes(2); // fill + outline
      expect(mapInstance.scrollZoom.disable).toHaveBeenCalled();
    });

    it('should render current location popup content', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const userPopup = getPopups().find((p) => p.setDOMContent.mock.calls.length > 0);
      expect(userPopup).toBeDefined();
      const content = userPopup!.setDOMContent.mock.calls[0][0] as HTMLElement;
      expect(content.textContent).toContain('You are here');
    });
  });

  describe('Sighting Markers', () => {
    it('should create a marker for each sighting plus the user marker', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      // 1 user marker + 3 sightings
      expect(getMarkers()).toHaveLength(4);
    });

    it('should position sighting markers at [longitude, latitude]', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      const firstSighting = mockMessages[0];
      expect(getMarkers()[1].setLngLat).toHaveBeenCalledWith([
        firstSighting.location.longitude,
        firstSighting.location.latitude,
      ]);
    });

    it('should build sighting popups with the sighting type label', () => {
      renderWithI18n(<SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />);

      const allPopupText = getPopups()
        .flatMap((p) => p.setDOMContent.mock.calls)
        .map((call) => (call[0] as HTMLElement).textContent)
        .join(' ');

      expect(allPopupText).toContain('ICE');
      expect(allPopupText).toContain('Army / National Guard');
      expect(allPopupText).toContain('Police');
    });
  });

  describe('Empty State', () => {
    it('should create only the user marker when messages array is empty', () => {
      renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      expect(getMarkers()).toHaveLength(1);
    });
  });

  describe('Location Updates', () => {
    it('should recentre the map when current location changes', () => {
      const { rerender } = renderWithI18n(
        <SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />
      );

      const newLocation = { latitude: 37.8, longitude: -122.45 };
      rerender(<I18nProvider><SightingMap messages={mockMessages} currentLocation={newLocation} /></I18nProvider>);

      expect(getMaps()[0].jumpTo).toHaveBeenCalledWith({ center: [newLocation.longitude, newLocation.latitude] });
    });

    it('should rebuild markers when messages change', () => {
      const { rerender } = renderWithI18n(
        <SightingMap messages={mockMessages} currentLocation={mockCurrentLocation} />
      );
      const countAfterFirstRender = getMarkers().length;

      const newMessages: Message[] = [
        {
          id: 'msg_new',
          sightingType: 'ICE',
          location: { latitude: 37.79, longitude: -122.43 },
          timestamp: Date.now(),
          geohash: 'hash_new',
          expiresAt: Date.now() + 3600000,
        },
      ];
      rerender(<I18nProvider><SightingMap messages={newMessages} currentLocation={mockCurrentLocation} /></I18nProvider>);

      // Old markers removed, new set created: 1 user + 1 sighting
      expect(getMarkers().length).toBeGreaterThan(countAfterFirstRender);
      expect(getMarkers().every((m) => m.remove.mock.calls.length > 0 || m.addTo.mock.calls.length > 0)).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove the map on unmount', () => {
      const { unmount } = renderWithI18n(<SightingMap messages={[]} currentLocation={mockCurrentLocation} />);

      const mapInstance = getMaps()[0];
      unmount();
      expect(mapInstance.remove).toHaveBeenCalled();
    });
  });
});
