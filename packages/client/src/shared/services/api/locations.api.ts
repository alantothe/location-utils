/**
 * Location management API
 */

import { apiGet, apiPost, apiPatch, apiPostFormData, unwrapEntry } from "./client";
import { API_ENDPOINTS } from "./config";
import type {
  LocationsResponse,
  LocationEntryResponse,
  Location,
  CreateMapsRequest,
  UpdateMapsRequest,
  AddInstagramRequest,
  InstagramEmbedResponse,
  UploadResponse,
  SuccessResponse,
  Category,
} from "./types";

// ============================================================================
// LOCATION MANAGEMENT
// ============================================================================

export const locationsApi = {
  /**
   * Get all locations with optional filters
   */
  async getLocations(params?: {
    category?: Category;
    locationKey?: string;
  }): Promise<LocationsResponse> {
    return apiGet<LocationsResponse>(API_ENDPOINTS.LOCATIONS, params as Record<string, string>);
  },

  /**
   * Create a new maps location
   */
  async createMapsLocation(data: CreateMapsRequest): Promise<Location> {
    const response = await apiPost<LocationEntryResponse>(API_ENDPOINTS.ADD_MAPS, data);
    return unwrapEntry(response);
  },

  /**
   * Update an existing maps location
   */
  async updateMapsLocation(
    id: number,
    data: UpdateMapsRequest
  ): Promise<Location> {
    return apiPatch<Location>(API_ENDPOINTS.UPDATE_MAPS(id), data);
  },

  /**
   * Add Instagram embed to a location
   */
  async addInstagramEmbed(
    locationId: number,
    data: AddInstagramRequest
  ): Promise<InstagramEmbedResponse["entry"]> {
    const response = await apiPost<InstagramEmbedResponse>(
      API_ENDPOINTS.ADD_INSTAGRAM(locationId),
      data
    );
    return unwrapEntry(response);
  },

  /**
   * Upload files to a location
   */
  async uploadFiles(
    locationId: number,
    files: File[],
    photographerCredit?: string
  ): Promise<UploadResponse["entry"]> {
    const formData = new FormData();

    if (photographerCredit) {
      formData.append("photographerCredit", photographerCredit);
    }

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiPostFormData<UploadResponse>(
      API_ENDPOINTS.ADD_UPLOAD(locationId),
      formData
    );
    return unwrapEntry(response);
  },

  /**
   * Clear the entire database
   */
  async clearDatabase(): Promise<SuccessResponse> {
    return apiGet<SuccessResponse>(API_ENDPOINTS.CLEAR_DB);
  },
};
