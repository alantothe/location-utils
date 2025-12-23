/**
 * API feature barrel exports
 *
 * Usage:
 * import { locationsApi, hierarchyApi, filesApi } from "@/features/api";
 *
 * // Fetch locations
 * const { locations } = await locationsApi.getLocations({ category: "dining" });
 *
 * // Get countries for dropdown
 * const { countries } = await hierarchyApi.getCountries();
 *
 * // Get image URL
 * const imageUrl = filesApi.getImageUrl(location.uploads[0].images[0]);
 */

// API services
export { locationsApi, hierarchyApi, filesApi } from "./api";

// React Query hooks
export * from "./hooks";

// HTTP client and utilities
export { ApiError, unwrapEntry } from "./client";
export type { ApiResponse } from "./client";

// Configuration (for advanced usage)
export { API_BASE_URL, API_ENDPOINTS } from "./config";

// Types
export type * from "./types";
