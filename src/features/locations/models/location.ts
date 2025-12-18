export type LocationCategory = 'dining' | 'accommodations' | 'attractions' | 'nightlife';

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

/**
 * Location
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
 * Instagram Embed
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
 * Upload
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
 * Location with nested children (API response type)
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


export interface AddInstagramRequest {
  embedCode: string;
  locationId: number;
}

/**
 * API Response Types - Nested structure for external consumption
 */
export interface LocationContact {
  countryCode: string | null;
  phoneNumber: string | null;
  website: string | null;
  contactAddress: string | null;
  url: string;
}

export interface LocationCoordinates {
  lat: number | null;
  lng: number | null;
}

export interface LocationSource {
  name: string;
  address: string;
}

export interface LocationResponse {
  id: number;
  title: string | null;
  category: LocationCategory;
  locationKey: string | null;
  contact: LocationContact;
  coordinates: LocationCoordinates;
  source: LocationSource;
  instagram_embeds: InstagramEmbed[];
  uploads: Upload[];
  created_at: string;
}
