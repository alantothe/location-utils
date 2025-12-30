import type { LocationResponse } from "../models/location";
import type { LocationCategory } from "../models/location";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@shared/errors/http-error";
import { PayloadApiClient } from "@server/shared/services/external/payload-api.client";
import { ImageStorageService } from "@server/shared/services/storage/image-storage.service";
import { LocationQueryService } from "./location-query.service";
import * as PayloadSyncRepo from "../repositories/payload-sync.repository";
import type { PayloadSyncState } from "../repositories/payload-sync.repository";

/**
 * Mapping from ISO country codes to phone country codes
 * Based on Payload's countryCode field validation
 */
const ISO_TO_PHONE_COUNTRY_CODE: Record<string, string> = {
  "US": "+1",
  "GB": "+44",
  "CA": "+1-CA",
  "AU": "+61",
  "DE": "+49",
  "FR": "+33",
  "IT": "+39",
  "ES": "+34",
  "BR": "+55",
  "MX": "+52",
  "JP": "+81",
  "CN": "+86",
  "IN": "+91",
  "PE": "+51",
  "CO": "+57",
  "AR": "+54",
  "CL": "+56",
};

export interface SyncResult {
  locationId: number;
  payloadDocId: string;
  status: "success" | "failed";
  error?: string;
}

export interface SyncStatusResponse {
  locationId: number;
  title: string;
  category: LocationCategory;
  synced: boolean;
  syncState?: PayloadSyncState;
}

export class PayloadSyncService {
  constructor(
    private readonly payloadClient: PayloadApiClient,
    private readonly imageStorage: ImageStorageService,
    private readonly locationQuery: LocationQueryService
  ) {}

  /**
   * Sync a single location to Payload CMS
   */
  async syncLocation(locationId: number): Promise<SyncResult> {
    // Check if Payload is configured
    if (!this.payloadClient.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    try {
      // Mark sync as pending
      const collection = await this.getCollectionForLocation(locationId);
      PayloadSyncRepo.saveSyncState(locationId, collection, "", "pending");

      // Fetch location data
      const location = this.locationQuery.getLocationById(locationId);
      if (!location) {
        throw new NotFoundError("Location", locationId);
      }

      console.log(`🔄 Syncing location ${locationId} (${location.title}) to Payload...`);

      // Upload images to Payload
      const uploadedImageIds = await this.uploadLocationImages(location);

      if (uploadedImageIds.length === 0) {
        console.warn(`⚠️  No images found for location ${locationId}, syncing without images`);
      }

      // Map location data to Payload format
      const payloadData = this.mapLocationToPayloadFormat(location, uploadedImageIds);

      // Create entry in Payload
      const response = await this.payloadClient.createEntry(collection, payloadData);

      // Save sync state
      PayloadSyncRepo.saveSyncState(
        locationId,
        collection,
        response.doc.id,
        "success"
      );

      console.log(`✅ Successfully synced location ${locationId} to Payload (doc ID: ${response.doc.id})`);

      return {
        locationId,
        payloadDocId: response.doc.id,
        status: "success",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Failed to sync location ${locationId}:`, errorMessage);

      // Save failed state
      try {
        const collection = await this.getCollectionForLocation(locationId);
        PayloadSyncRepo.saveSyncState(locationId, collection, "", "failed", errorMessage);
      } catch {
        // Ignore error if we can't save sync state
      }

      return {
        locationId,
        payloadDocId: "",
        status: "failed",
        error: errorMessage,
      };
    }
  }

  /**
   * Sync all locations, optionally filtered by category
   */
  async syncAllLocations(category?: LocationCategory): Promise<SyncResult[]> {
    if (!this.payloadClient.isConfigured()) {
      throw new ServiceUnavailableError("Payload CMS");
    }

    // Get all locations
    const locations = this.locationQuery.listLocations(category);

    console.log(`🔄 Starting batch sync: ${locations.length} locations`);

    const results: SyncResult[] = [];

    for (const location of locations) {
      const result = await this.syncLocation(location.id!);
      results.push(result);

      // Small delay to avoid overwhelming Payload
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.status === "success").length;
    const failedCount = results.filter(r => r.status === "failed").length;

    console.log(`✅ Batch sync complete: ${successCount} success, ${failedCount} failed`);

    return results;
  }

  /**
   * Get sync status for location(s)
   */
  getSyncStatus(locationId?: number): SyncStatusResponse[] {
    if (locationId) {
      const location = this.locationQuery.getLocationById(locationId);
      if (!location) {
        throw new NotFoundError("Location", locationId);
      }

      const collection = this.mapCategoryToCollection(location.category);
      const syncState = PayloadSyncRepo.getSyncState(locationId, collection);

      return [{
        locationId,
        title: location.title || location.source.name,
        category: location.category,
        synced: !!syncState && syncState.sync_status === "success",
        syncState: syncState || undefined,
      }];
    }

    // Get all locations with sync state
    const allLocations = this.locationQuery.listLocations();
    const allSyncStates = PayloadSyncRepo.getAllSyncedLocations();

    // Create a map for quick lookup
    const syncStateMap = new Map<number, PayloadSyncState>();
    allSyncStates.forEach(state => {
      syncStateMap.set(state.location_id, state);
    });

    return allLocations.map(location => ({
      locationId: location.id!,
      title: location.title || location.source.name,
      category: location.category,
      synced: syncStateMap.has(location.id!) &&
              syncStateMap.get(location.id!)?.sync_status === "success",
      syncState: syncStateMap.get(location.id!),
    }));
  }

  /**
   * Upload all images for a location to Payload
   * Returns array of MediaAsset IDs
   */
  private async uploadLocationImages(location: LocationResponse): Promise<string[]> {
    const uploadedIds: string[] = [];

    try {
      // Upload Instagram embed images
      for (const embed of location.instagram_embeds) {
        if (embed.images && embed.images.length > 0) {
          for (const imagePath of embed.images) {
            try {
              const imageBuffer = await this.imageStorage.readImage(imagePath);
              const filename = imagePath.split("/").pop() || "image.jpg";
              const altText = `Instagram post by ${embed.username}`;

              const mediaAssetId = await this.payloadClient.uploadImage(
                imageBuffer,
                filename,
                altText,
                this.mapLocationKeyToPayloadLocation(location.locationKey || undefined)
              );

              uploadedIds.push(mediaAssetId);
            } catch (error) {
              console.warn(`⚠️  Failed to upload image ${imagePath}:`, error);
              // Continue with other images
            }
          }
        }
      }

      // Upload direct upload images
      for (const upload of location.uploads) {
        if (upload.images && upload.images.length > 0) {
          for (const imagePath of upload.images) {
            try {
              const imageBuffer = await this.imageStorage.readImage(imagePath);
              const filename = imagePath.split("/").pop() || "image.jpg";
              const altText = upload.photographerCredit ?
                `Photo by ${upload.photographerCredit}` :
                location.title || location.source.name;

              const mediaAssetId = await this.payloadClient.uploadImage(
                imageBuffer,
                filename,
                altText,
                this.mapLocationKeyToPayloadLocation(location.locationKey || undefined)
              );

              uploadedIds.push(mediaAssetId);
            } catch (error) {
              console.warn(`⚠️  Failed to upload image ${imagePath}:`, error);
              // Continue with other images
            }
          }
        }
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      // Return whatever images we successfully uploaded
    }

    return uploadedIds;
  }

  /**
   * Map url-util location to Payload format
   */
  private mapLocationToPayloadFormat(
    location: LocationResponse,
    imageIds: string[]
  ) {
    return {
      title: location.title || location.source.name,
      type: this.mapCategoryToType(location.category),
      location: this.mapLocationKeyToPayloadLocation(location.locationKey || undefined) || "unknown",
      gallery: imageIds.map(id => ({
        image: id,
        altText: "",
        caption: "",
      })),
      address: location.contact.url || "",
      countryCode: this.convertIsoToPhoneCountryCode(location.contact.countryCode || undefined) || "",
      phoneNumber: this.extractPhoneNumber(location.contact.phoneNumber || undefined) || "",
      website: location.contact.website || "",
      latitude: location.coordinates.lat || undefined,
      longitude: location.coordinates.lng || undefined,
      status: "published" as const,
    };
  }

  /**
   * Map category to Payload collection name
   */
  private mapCategoryToCollection(
    category: LocationCategory
  ): "dining" | "accommodations" | "attractions" | "nightlife" {
    // Direct mapping - categories match collection names
    return category as "dining" | "accommodations" | "attractions" | "nightlife";
  }

  /**
   * Map category to Payload type field
   * (Simplified - could be expanded with more specific mappings)
   */
  private mapCategoryToType(category: LocationCategory): string {
    const typeMap: Record<LocationCategory, string> = {
      dining: "restaurant",
      accommodations: "hotel",
      attractions: "museum",
      nightlife: "nightclub",
    };

    return typeMap[category] || "other";
  }

  /**
   * Map locationKey to Payload location identifier
   * url-util: "colombia|bogota|chapinero"
   * Payload: "bogota-colombia" (or similar format)
   */
  private mapLocationKeyToPayloadLocation(locationKey?: string): string | undefined {
    if (!locationKey) return undefined;

    const parts = locationKey.split("|");
    if (parts.length < 2) return undefined;

    const [country, city] = parts;
    return `${city}-${country}`.toLowerCase();
  }

  /**
   * Convert ISO country code to phone country code
   * e.g., "PE" -> "+51", "CO" -> "+57"
   */
  private convertIsoToPhoneCountryCode(isoCode?: string): string | undefined {
    if (!isoCode) return undefined;
    return ISO_TO_PHONE_COUNTRY_CODE[isoCode.toUpperCase()];
  }

  /**
   * Extract phone number without country code prefix
   * e.g., "+51 946 419 932" -> "946419932"
   */
  private extractPhoneNumber(fullPhoneNumber?: string): string | undefined {
    if (!fullPhoneNumber) return undefined;

    // Remove common country code prefixes first (before removing spaces)
    // Match patterns like +51, +1, +44, +1-CA, etc.
    let cleaned = fullPhoneNumber.replace(/^\+\d{1,3}(-[A-Z]{2})?\s*/, "");

    // Remove all spaces, hyphens, and parentheses
    cleaned = cleaned.replace(/[\s\-\(\)]/g, "");

    // Remove leading zeros if any
    cleaned = cleaned.replace(/^0+/, "");

    return cleaned || undefined;
  }

  /**
   * Helper: Get collection for a location
   */
  private async getCollectionForLocation(
    locationId: number
  ): Promise<"dining" | "accommodations" | "attractions" | "nightlife"> {
    const location = this.locationQuery.getLocationById(locationId);
    if (!location) {
      throw new NotFoundError("Location", locationId);
    }

    return this.mapCategoryToCollection(location.category);
  }
}
