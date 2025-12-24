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
  ADD_MAPS: "/api/add-maps",
  UPDATE_MAPS: (id: number) => `/api/maps/${id}`,
  ADD_INSTAGRAM: (locationId: number) => `/api/add-instagram/${locationId}`,
  ADD_UPLOAD: (locationId: number) => `/api/add-upload/${locationId}`,
  CLEAR_DB: "/api/clear-db",

  // Location hierarchy
  HIERARCHY: "/api/location-hierarchy",
  COUNTRIES: "/api/location-hierarchy/countries",
  CITIES: (country: string) => `/api/location-hierarchy/cities/${country}`,
  NEIGHBORHOODS: (country: string, city: string) =>
    `/api/location-hierarchy/neighborhoods/${country}/${city}`,

  // Files
  OPEN_FOLDER: "/api/open-folder",
} as const;
