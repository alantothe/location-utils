import { generateGoogleMapsUrl, extractInstagramData, normalizeInstagram, getCoordinates } from './utils';
import type { LocationEntry, LocationCategory } from './db';

// Unified Location factory helpers that produce objects compatible with `LocationEntry` used by the DB.

export async function createFromMaps(name: string, address: string, apiKey?: string, category: LocationCategory = 'attractions'): Promise<LocationEntry> {
  const url = generateGoogleMapsUrl(name, address);
  const entry: LocationEntry = {
    name,
    address,
    url,
    embed_code: undefined,
    instagram: undefined,
    images: [],
    original_image_urls: [],
    lat: null,
    lng: null,
    parent_id: null,
    type: 'maps',
    category
  };

  if (apiKey) {
    try {
      const coords = await getCoordinates(address, apiKey);
      if (coords) {
        entry.lat = coords.lat;
        entry.lng = coords.lng;
      }
    } catch (e) {
      console.warn('Failed to fetch coordinates in createFromMaps:', e);
    }
  }

  return entry;
}

export function createFromInstagram(embedHtml: string, parentLocationId?: number): LocationEntry {
  const { url, author } = extractInstagramData(embedHtml);
  // Always include timestamp to ensure uniqueness (multiple embeds from same author)
  const name = author
    ? `${author}_${Date.now()}`
    : `Instagram_${Date.now()}`;
  const instaProfile = normalizeInstagram(author);

  const entry: LocationEntry = {
    name,
    address: 'Instagram Embed',
    url: url || '',
    embed_code: embedHtml,
    instagram: instaProfile || undefined,
    images: [],
    original_image_urls: [],
    lat: null,
    lng: null,
    parent_id: parentLocationId || null,
    type: 'instagram'
  };

  return entry;
}

export function createFromUpload(parentLocationId: number, timestamp?: number): LocationEntry {
  const ts = timestamp || Date.now();
  const name = `Upload ${ts}`;

  const entry: LocationEntry = {
    name,
    address: 'Direct Upload',
    url: '',
    embed_code: undefined,
    instagram: undefined,
    images: [],
    original_image_urls: [],
    lat: null,
    lng: null,
    parent_id: parentLocationId,
    type: 'upload'
  };

  return entry;
}
