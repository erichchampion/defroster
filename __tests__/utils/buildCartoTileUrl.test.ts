import { CARTO_TILE_URL_TEMPLATE, buildCartoTileUrl } from '@/lib/constants/app';

describe('buildCartoTileUrl', () => {
  it('appends the API key when one is provided', () => {
    expect(buildCartoTileUrl('test-key-123')).toBe(`${CARTO_TILE_URL_TEMPLATE}?key=test-key-123`);
  });

  it('returns the bare template when the key is undefined', () => {
    expect(buildCartoTileUrl(undefined)).toBe(CARTO_TILE_URL_TEMPLATE);
    expect(buildCartoTileUrl(undefined)).not.toContain('key=');
  });

  it('returns the bare template when the key is an empty string', () => {
    expect(buildCartoTileUrl('')).toBe(CARTO_TILE_URL_TEMPLATE);
    expect(buildCartoTileUrl('')).not.toContain('key=');
  });

  it('uses a Leaflet-compatible {s} subdomain template', () => {
    expect(CARTO_TILE_URL_TEMPLATE).toContain('{s}');
    expect(CARTO_TILE_URL_TEMPLATE).toContain('{z}');
    expect(CARTO_TILE_URL_TEMPLATE).toContain('{x}');
    expect(CARTO_TILE_URL_TEMPLATE).toContain('{y}');
  });
});
