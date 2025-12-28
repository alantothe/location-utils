/**
 * API configuration and constants
 */

/**
 * Base URL for API requests
 * - In development: Empty string to use Vite proxy (relative URLs)
 * - In production: Full API URL from VITE_API_BASE_URL
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
  // Location management
  LOCATIONS: "/api/locations",
  LOCATIONS_BASIC: "/api/locations-basic",
  GET_LOCATION_BY_ID: (id: number) => `/api/locations/${id}`,
  CREATE_LOCATION: "/api/locations",
  UPDATE_LOCATION: (id: number) => `/api/locations/${id}`,
  DELETE_LOCATION: (id: number) => `/api/locations/${id}`,
  ADD_INSTAGRAM: (locationId: number) => `/api/add-instagram/${locationId}`,
  ADD_UPLOAD: (locationId: number) => `/api/add-upload/${locationId}`,
  CLEAR_DB: "/api/clear-db",

  // Location hierarchy
  HIERARCHY: "/api/location-hierarchy",
  COUNTRIES: "/api/location-hierarchy/countries",
  COUNTRIES_LIST: "/api/countries",
  CITIES: (country: string) => `/api/location-hierarchy/cities/${country}`,
  NEIGHBORHOODS: (country: string, city: string) =>
    `/api/location-hierarchy/neighborhoods/${country}/${city}`,

  // Admin taxonomy management
  ADMIN_TAXONOMY_PENDING: "/api/admin/taxonomy/pending",
  ADMIN_TAXONOMY_APPROVE: (locationKey: string) => `/api/admin/taxonomy/${encodeURIComponent(locationKey)}/approve`,
  ADMIN_TAXONOMY_REJECT: (locationKey: string) => `/api/admin/taxonomy/${encodeURIComponent(locationKey)}/reject`,
  ADMIN_TAXONOMY_CORRECTIONS: "/api/admin/taxonomy/corrections",
  ADMIN_TAXONOMY_CORRECTIONS_PREVIEW: "/api/admin/taxonomy/corrections/preview",
  ADMIN_TAXONOMY_CORRECTION_DELETE: (id: number) => `/api/admin/taxonomy/corrections/${id}`,

  // Files
  OPEN_FOLDER: "/api/open-folder",
  IMAGES: "/api/images",
} as const;
