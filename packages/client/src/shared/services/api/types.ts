/**
 * API types matching server responses
 */

export type Category = "dining" | "accommodations" | "attractions" | "nightlife";

export interface ContactInfo {
  countryCode: string;
  phoneNumber: string | null;
  website: string | null;
  contactAddress: string;
  url: string;
}

export interface Coordinates {
  lat: number | null;
  lng: number | null;
}

export interface SourceInfo {
  name: string;
  address: string;
}

export interface InstagramEmbed {
  id: number;
  location_id: number;
  username: string | null;
  url: string;
  embed_code: string;
  instagram: string | null;
  images: string[];
  original_image_urls: string[];
  created_at: string;
}

export interface Upload {
  id: number;
  location_id: number;
  photographerCredit: string | null;
  images: string[];
  created_at: string;
}

export interface Location {
  id: number;
  title: string | null;
  category: Category;
  locationKey: string;
  contact: ContactInfo;
  coordinates: Coordinates;
  source: SourceInfo;
  instagram_embeds: InstagramEmbed[];
  uploads: Upload[];
  created_at: string;
}

export interface LocationsResponse {
  locations: Location[];
  cwd: string;
}

export interface LocationEntryResponse {
  entry: Location;
}

export interface InstagramEmbedResponse {
  entry: InstagramEmbed;
}

export interface UploadResponse {
  entry: Upload;
}

export interface CreateMapsRequest {
  name: string;
  address: string;
  category: Category;
  locationKey?: string;
  title?: string;
  contactAddress?: string;
  countryCode?: string;
  phoneNumber?: string;
  website?: string;
}

export interface UpdateMapsRequest {
  title?: string;
  category?: Category;
  locationKey?: string;
  contactAddress?: string;
  countryCode?: string;
  phoneNumber?: string;
  website?: string;
}

export interface AddInstagramRequest {
  embedCode: string;
}

export interface OpenFolderRequest {
  folderPath: string;
}

export interface SuccessResponse {
  success: true;
  message?: string;
}

export interface Neighborhood {
  label: string;
  value: string;
}

export interface City {
  label: string;
  value: string;
  neighborhoods: Neighborhood[];
}

export interface Country {
  code: string;
  label: string;
  cities: City[];
}

export interface LocationHierarchyItem {
  id: number;
  country: string;
  city: string;
  neighborhood: string;
  locationKey: string;
}

export interface LocationHierarchyResponse {
  locations: LocationHierarchyItem[];
}

export interface CountriesResponse {
  countries: Country[];
}

export interface CitiesResponse {
  cities: City[];
}

export interface NeighborhoodsResponse {
  neighborhoods: Neighborhood[];
}
