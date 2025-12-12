export type LocationCategory = 'dining' | 'accommodations' | 'attractions' | 'nightlife';

export type LocationType = 'maps' | 'instagram' | 'upload';

export interface LocationEntry {
  id?: number;
  name: string;
  address: string;
  url: string;
  embed_code?: string | null;
  instagram?: string | null;
  images?: string[];
  original_image_urls?: string[];
  lat?: number | null;
  lng?: number | null;
  parent_id?: number | null;
  type?: LocationType;
  category?: LocationCategory;
}

export interface LocationWithChildren extends LocationEntry {
  instagram_embeds?: LocationEntry[];
  uploads?: LocationEntry[];
}

export interface CreateMapsRequest {
  name: string;
  address: string;
  category?: LocationCategory;
}

export interface UpdateMapsRequest {
  id: number;
  name: string;
  address: string;
  category?: LocationCategory;
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
