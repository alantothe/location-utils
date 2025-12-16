export type LocationCategory = 'dining' | 'accommodations' | 'attractions' | 'nightlife';

export type LocationType = 'maps' | 'instagram' | 'upload';

// Hierarchical Location Taxonomy Types
export interface NeighborhoodData {
  label: string;
  value: string;
}

export interface CityData {
  label: string;
  value: string;
  neighborhoods: NeighborhoodData[];
}

export interface CountryData {
  code: string;
  label: string;
  cities: CityData[];
}

export interface LocationHierarchy {
  id?: number;
  country: string;
  city: string | null;
  neighborhood: string | null;
  locationKey: string; // Pipe-delimited: "colombia|bogota|chapinero"
}

export type DiningType =
  | 'restaurant'
  | 'fast-food'
  | 'food-truck'
  | 'cafe'
  | 'bar'
  | 'pub'
  | 'rooftop-bar'
  | 'street-food'
  | 'brewery'
  | 'winery'
  | 'seafood'
  | 'italian'
  | 'american'
  | 'wine-bar'
  | 'cocktail-bar'
  | 'dive-bar'
  | 'buffet'
  | 'bakery'
  | 'dessert'
  | 'ice-cream'
  | 'coffee-shop'
  | 'tea-shop'
  | 'juice-bar'
  | 'smoothie-bar'
  | 'pizza';

export interface LocationEntry {
  id?: number;
  name: string;
  title?: string | null;
  address: string;
  url: string;
  embed_code?: string | null;
  instagram?: string | null;
  images?: string[];
  original_image_urls?: string[];
  lat?: number | null;
  lng?: number | null;
  /**
   * Parent location ID.
   * - MUST be null/undefined for type='maps'
   * - MUST be set for type='instagram' and type='upload'
   */
  parent_id?: number | null;
  type?: LocationType;
  category?: LocationCategory;
  // Contact Information fields
  contactAddress?: string | null;
  countryCode?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  // Hierarchical Location Taxonomy
  locationKey?: string | null; // Pipe-delimited location key
}

export interface LocationWithChildren extends LocationEntry {
  instagram_embeds?: LocationEntry[];
  uploads?: LocationEntry[];
}

// ===== NEW NORMALIZED TYPES =====
// These will replace LocationEntry after migration

/**
 * Location (replaces type='maps' entries from old LocationEntry)
 * Represents actual physical locations (restaurants, attractions, etc.)
 */
export interface Location {
  id?: number;
  name: string;
  title?: string | null;
  address: string;
  url: string;
  lat?: number | null;
  lng?: number | null;
  category?: LocationCategory;
  locationKey?: string | null;
  contactAddress?: string | null;
  countryCode?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  created_at?: string;
}

/**
 * Instagram Embed (replaces type='instagram' entries from old LocationEntry)
 * Represents Instagram posts embedded for a location
 */
export interface InstagramEmbed {
  id?: number;
  location_id: number;  // FK to locations table
  username: string;
  url: string;
  embed_code: string;
  instagram?: string | null;  // Instagram profile URL
  images?: string[];
  original_image_urls?: string[];
  created_at?: string;
}

/**
 * Upload (replaces type='upload' entries from old LocationEntry)
 * Represents directly uploaded images for a location
 */
export interface Upload {
  id?: number;
  location_id: number;  // FK to locations table
  photographerCredit?: string | null;  // Optional photographer attribution
  images?: string[];
  created_at?: string;
}

/**
 * Location with nested children (new API response type)
 * Replaces LocationWithChildren after migration
 */
export interface LocationWithNested extends Location {
  instagram_embeds?: InstagramEmbed[];
  uploads?: Upload[];
}

export interface CreateMapsRequest {
  name: string;
  address: string;
  category: LocationCategory;
}

export interface UpdateMapsRequest {
  id: number;
  name: string;
  title?: string | null;
  address: string;
  category?: LocationCategory;
  contactAddress?: string;
  countryCode?: string;
  phoneNumber?: string;
  website?: string;
  locationKey?: string | null;
}

export interface AddInstagramRequest {
  embedCode: string;
  locationId: number;
}

export interface AddUploadRequest {
  parentId: number;
}

export interface RawLocation {
  name: string;
  address: string;
}
