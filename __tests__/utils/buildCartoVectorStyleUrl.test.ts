import { CARTO_VECTOR_STYLE_URL_TEMPLATE, buildCartoVectorStyleUrl } from '@/lib/constants/app';

describe('buildCartoVectorStyleUrl', () => {
  it('appends the API key when one is provided', () => {
    expect(buildCartoVectorStyleUrl('test-key-123')).toBe(
      `${CARTO_VECTOR_STYLE_URL_TEMPLATE}?key=test-key-123`
    );
  });

  it('returns the bare style URL when the key is undefined', () => {
    expect(buildCartoVectorStyleUrl(undefined)).toBe(CARTO_VECTOR_STYLE_URL_TEMPLATE);
    expect(buildCartoVectorStyleUrl(undefined)).not.toContain('key=');
  });

  it('returns the bare style URL when the key is an empty string', () => {
    expect(buildCartoVectorStyleUrl('')).toBe(CARTO_VECTOR_STYLE_URL_TEMPLATE);
    expect(buildCartoVectorStyleUrl('')).not.toContain('key=');
  });

  it('points at the CARTO Positron vector style', () => {
    expect(CARTO_VECTOR_STYLE_URL_TEMPLATE).toContain('basemaps.cartocdn.com');
    expect(CARTO_VECTOR_STYLE_URL_TEMPLATE).toContain('positron-gl-style');
    expect(CARTO_VECTOR_STYLE_URL_TEMPLATE).toMatch(/style\.json$/);
  });
});
