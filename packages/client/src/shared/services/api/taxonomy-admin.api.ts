/**
 * Taxonomy admin API
 */

import { apiGet, apiPatch, apiDelete } from "./client";
import { API_ENDPOINTS } from "./config";
import type {
  PendingTaxonomyEntry,
  SuccessResponse,
} from "./types";

/**
 * Unwrapped response types (after apiGet/apiPatch removes the outer wrapper)
 */
interface PendingTaxonomyData {
  entries: PendingTaxonomyEntry[];
}

interface TaxonomyEntryData {
  entry: {
    id: number;
    country: string;
    city: string | null;
    neighborhood: string | null;
    locationKey: string;
    status: 'pending' | 'approved';
    created_at: string;
  };
}

export const taxonomyAdminApi = {
  /**
   * Get all pending taxonomy entries
   */
  async getPendingEntries(): Promise<PendingTaxonomyEntry[]> {
    const response = await apiGet<PendingTaxonomyData>(
      API_ENDPOINTS.ADMIN_TAXONOMY_PENDING
    );
    return response.entries;
  },

  /**
   * Approve a pending taxonomy entry
   */
  async approveEntry(locationKey: string): Promise<TaxonomyEntryData["entry"]> {
    const response = await apiPatch<TaxonomyEntryData>(
      API_ENDPOINTS.ADMIN_TAXONOMY_APPROVE(locationKey),
      {}
    );
    return response.entry;
  },

  /**
   * Reject a pending taxonomy entry
   */
  async rejectEntry(locationKey: string): Promise<void> {
    await apiDelete<SuccessResponse>(
      API_ENDPOINTS.ADMIN_TAXONOMY_REJECT(locationKey)
    );
  },
};
