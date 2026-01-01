import type { LocationResponse } from "../models/location";
import type { LocationCategory } from "../models/location";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@shared/errors/http-error";
import { PayloadApiClient } from "@server/shared/services/external/payload-api.client";
import type { PayloadLocationCreateData } from "@server/shared/services/external/payload-api.client";
import { ImageStorageService } from "@server/shared/services/storage/image-storage.service";
import { LocationQueryService } from "./location-query.service";
import * as PayloadSyncRepo from "../repositories/payload-sync.repository";
import type { PayloadSyncState } from "../repositories/payload-sync.repository";
import { formatLocationName, parseLocationValue } from "../utils/location-utils";

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

interface UploadedImagesResult {
  galleryImageIds: string[];      // MediaAsset IDs for regular uploads
  instagramPostIds: string[];     // Instagram post IDs for embeds
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

      console.log("📍 Location details", {
        locationId,
        title: location.title || location.source.name,
        category: location.category,
        locationKey: location.locationKey || null,
      });

      console.log(`🔄 Syncing location ${locationId} (${location.title}) to Payload...`);

      // Resolve Payload location reference (REQUIRED by Payload)
      const locationRef = await this.resolvePayloadLocationRef(location);
      console.log("🔗 Payload location ref", {
        locationId,
        locationKey: location.locationKey || null,
        locationRef,
      });

      // If locationRef is required by Payload but resolution failed, abort sync
      if (!locationRef) {
        throw new BadRequestError(
          `Cannot sync location ${locationId}: locationRef is required by Payload CMS. ` +
          `Location must have a valid locationKey (current: ${location.locationKey || "none"})`
        );
      }

      // Upload images and create Instagram posts
      const uploadedImages = await this.uploadLocationImages(location);

      if (uploadedImages.galleryImageIds.length === 0 &&
          uploadedImages.instagramPostIds.length === 0) {
        console.warn(
          `⚠️  No images or Instagram posts found for location ${locationId}, syncing without media`
        );
      } else {
        console.log(
          `✓ Uploaded ${uploadedImages.galleryImageIds.length} gallery images, ` +
          `created ${uploadedImages.instagramPostIds.length} Instagram posts`
        );
      }

      // Map location data to Payload format (locationRef is guaranteed at this point)
      const payloadData = this.mapLocationToPayloadFormat(location, uploadedImages, locationRef);
      console.log("🧾 Payload entry payload", {
        locationId,
        collection,
        title: payloadData.title,
        locationRef: payloadData.locationRef,
        galleryCount: payloadData.gallery.length,
        instagramCount: payloadData.instagramGallery?.length || 0,
      });

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
   * Upload images and create Instagram posts for a location
   * Returns separate arrays for gallery images and Instagram post IDs
   */
  private async uploadLocationImages(location: LocationResponse): Promise<UploadedImagesResult> {
    const galleryImageIds: string[] = [];
    const instagramPostIds: string[] = [];

    try {
      // Upload direct upload images (ALL images go to gallery)
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

              galleryImageIds.push(mediaAssetId);
            } catch (error) {
              console.warn(`⚠️  Failed to upload image ${imagePath}:`, error);
              // Continue with other images
            }
          }
        }
      }

      // Process Instagram embeds (FIRST image only + create post)
      for (const embed of location.instagram_embeds) {
        if (embed.images && embed.images.length > 0) {
          const previewImagePath = embed.images[0];
          if (!previewImagePath) continue; // Skip if no preview image

          let previewMediaAssetId: string | null = null;

          try {
            // Step 1: Upload ONLY first image as preview
            const imageBuffer = await this.imageStorage.readImage(previewImagePath);
            const filename = previewImagePath.split("/").pop() || "instagram.jpg";
            const altText = `Instagram post by ${embed.username}`;

            previewMediaAssetId = await this.payloadClient.uploadImage(
              imageBuffer,
              filename,
              altText,
              this.mapLocationKeyToPayloadLocation(location.locationKey || undefined)
            );

            console.log(`✓ Uploaded Instagram preview image: ${previewMediaAssetId}`);

            // Step 2: Create Instagram post with preview image
            const postTitle = this.createInstagramPostTitle(embed.username, location);
            const instagramPostId = await this.payloadClient.createInstagramPost({
              title: postTitle,
              embedCode: embed.embed_code,
              previewImage: previewMediaAssetId,
              status: "published",
            });

            instagramPostIds.push(instagramPostId);
            console.log(`✓ Created Instagram post: ${instagramPostId}`);

          } catch (error) {
            if (previewMediaAssetId) {
              console.warn(
                `⚠️  Instagram post creation failed for ${embed.username}, ` +
                `but preview image was uploaded (MediaAsset: ${previewMediaAssetId})`
              );
            } else {
              console.warn(`⚠️  Failed to process Instagram embed for ${embed.username}:`, error);
            }
            // Continue with other embeds
          }
        }
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      // Return whatever we successfully processed
    }

    return { galleryImageIds, instagramPostIds };
  }

  /**
   * Create Instagram post title from username and location
   */
  private createInstagramPostTitle(username: string, location: LocationResponse): string {
    const locationName = location.title || location.source.name;
    const cleanUsername = username.replace(/^@/, "");
    return `@${cleanUsername} at ${locationName}`;
  }

  /**
   * Map url-util location to Payload format
   * @param locationRef - REQUIRED by Payload CMS, guaranteed to be present by caller
   */
  private mapLocationToPayloadFormat(
    location: LocationResponse,
    uploadedImages: UploadedImagesResult,
    locationRef: string
  ) {
    return {
      title: location.title || location.source.name,
      type: this.mapCategoryToType(location.category),
      locationRef, // Always included - required by Payload
      gallery: uploadedImages.galleryImageIds.map(id => ({
        image: id,
        altText: "",
        caption: "",
      })),
      instagramGallery: uploadedImages.instagramPostIds.map(id => ({
        post: id,
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

  /**
   * Resolve Payload location reference by locationKey
   */
  private async resolvePayloadLocationRef(location: LocationResponse): Promise<string | null> {
    const locationKey = location.locationKey || "";

    if (!locationKey) {
      console.warn(`⚠️  Location ${location.id} missing locationKey; skipping Payload location lookup`);
      return null;
    }

    const locationRef = await this.payloadClient.getLocationRefByKey(locationKey);

    if (locationRef) {
      return locationRef;
    }

    console.warn(`⚠️  No Payload location found for locationKey: ${locationKey}`);

    const createPayload = this.buildPayloadLocationData(locationKey);
    if (!createPayload) {
      console.warn(`⚠️  Unable to build Payload location payload for ${locationKey}`);
      return null;
    }

    console.log("🧭 Creating Payload location", {
      locationKey,
      payload: createPayload,
    });

    const createdRef = await this.payloadClient.createLocation(createPayload);
    console.log("✅ Payload location created", {
      locationKey,
      locationRef: createdRef,
    });

    return createdRef;
  }

  /**
   * Build a Payload location payload from a locationKey
   */
  private buildPayloadLocationData(locationKey: string): PayloadLocationCreateData | null {
    const parsed = parseLocationValue(locationKey);
    if (!parsed) {
      return null;
    }

    const countryName = formatLocationName(parsed.country);

    if (parsed.city && parsed.neighborhood) {
      return {
        level: "neighborhood",
        country: parsed.country,
        city: parsed.city,
        neighborhood: parsed.neighborhood,
        countryName,
        cityName: formatLocationName(parsed.city),
        neighborhoodName: formatLocationName(parsed.neighborhood),
      };
    }

    if (parsed.city) {
      return {
        level: "city",
        country: parsed.country,
        city: parsed.city,
        countryName,
        cityName: formatLocationName(parsed.city),
      };
    }

    return {
      level: "country",
      country: parsed.country,
      countryName,
    };
  }
}
