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
  status?: 'approved' | 'pending';
  created_at?: string;
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
  district?: string | null;
  contactAddress?: string | null;
  countryCode?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  slug?: string | null;
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
 * Image Metadata
 * File information for uploaded images
 */
export interface ImageMetadata {
  width: number;
  height: number;
  size: number; // bytes
  format: string; // 'jpeg', 'png', 'webp', 'gif'
}

/**
 * Legacy Upload (backward compatibility)
 * Represents the old single-image upload format with parallel arrays
 */
export interface LegacyUpload {
  id?: number;
  location_id: number;  // FK to locations table
  photographerCredit?: string | null;  // Optional photographer attribution
  images?: string[];
  imageMetadata?: ImageMetadata[];  // Metadata for each image (parallel array)
  created_at?: string;
  format: 'legacy';  // Discriminator for union type
}

/**
 * ImageSet Upload (multi-variant system)
 * Represents the new multi-variant upload format with ImageSet structure
 */
export interface ImageSetUpload {
  id?: number;
  location_id: number;  // FK to locations table
  photographerCredit?: string | null;  // Optional photographer attribution
  imageSets?: import('@url-util/shared').ImageSet[];  // Array of ImageSet objects
  created_at?: string;
  format: 'imageset';  // Discriminator for union type
}

/**
 * Upload (discriminated union)
 * Union type supporting both legacy and imageset formats for backward compatibility
 */
export type Upload = LegacyUpload | ImageSetUpload;

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
  district: string | null;
  contact: LocationContact;
  coordinates: LocationCoordinates;
  source: LocationSource;
  instagram_embeds: InstagramEmbed[];
  uploads: Upload[];
  slug: string | null;
  created_at: string;
}

/**
 * Basic location info for lightweight API responses
 */
export interface LocationBasic {
  id: number;
  name: string;
  location: string | null;
  category: LocationCategory;
}
