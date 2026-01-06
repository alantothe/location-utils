import type { LocationCategory } from "../../models/location";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@shared/errors/http-error";
import type { PayloadApiClient } from "@server/shared/services/external/payload-api.client";
import { ImageStorageService } from "@server/shared/services/storage/image-storage.service";
import { LocationQueryService } from "../core/location-query.service";
import * as PayloadSyncRepo from "../../repositories/integration";
import { updateLocationById } from "../../repositories/core";

// Import sub-modules
import type { SyncResult, SyncStatusResponse } from "./types";
import { uploadLocationImages } from "./handlers";
import { mapLocationToPayloadFormat, mapCategoryToCollection } from "./mappers";

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

      // Use stored locationRef (or auto-resolve if missing)
      let locationRef = location.payload_location_ref;

      // If missing, auto-resolve (graceful handling for legacy locations)
      if (!locationRef) {
        console.warn(`⚠️  Location ${locationId} missing payload_location_ref, auto-resolving...`);

        // Dynamic import to avoid circular dependencies
        const { resolvePayloadLocationRef } = await import('./resolvers');
        locationRef = await resolvePayloadLocationRef(location, this.payloadClient);

        if (!locationRef) {
          throw new BadRequestError(
            `Failed to resolve Payload location for locationKey: ${location.locationKey || "none"}. ` +
            `Ensure the location hierarchy exists in Payload CMS.`
          );
        }

        // Update local database with resolved ref
        const updated = updateLocationById(locationId, { payload_location_ref: locationRef });
        if (!updated) {
          console.warn(`⚠️  Failed to save payload_location_ref to database for location ${locationId}`);
        } else {
          console.log(`✅ Auto-resolved and saved locationRef: ${locationRef}`);
        }
      } else {
        console.log(`✓ Using stored locationRef for location ${locationId}: ${locationRef}`);
      }

      // Upload images and create Instagram posts
      const uploadedImages = await uploadLocationImages(location, this.payloadClient, this.imageStorage);

      // Map location data to Payload format (locationRef is guaranteed at this point)
      const payloadData = mapLocationToPayloadFormat(location, uploadedImages, locationRef);

      console.log(`🔄 [SYNC] Location ${locationId} type value:`, location.type);
      console.log(`🔄 [SYNC] Payload data type:`, payloadData.type);

      // Check if this location has a stored Payload document ID
      const existingSyncState = PayloadSyncRepo.getSyncState(locationId, collection);

      let response: any;
      if (existingSyncState?.payload_doc_id) {
        // Update existing document using stored payload_doc_id (regardless of previous sync status)
        console.log(`✓ Updating existing Payload document: ${existingSyncState.payload_doc_id}`);
        response = await this.payloadClient.updateEntry(collection, existingSyncState.payload_doc_id, payloadData);
      } else {
        // Create new document (first time sync)
        console.log(`✓ Creating new Payload document`);
        response = await this.payloadClient.createEntry(collection, payloadData);
      }

      // Log and save the Payload document ID
      console.log(`📄 Payload document ID: ${response.doc.id} (location ${locationId})`);

      // Generate a single timestamp for both sync state and location update
      // Use SQLite's datetime format (YYYY-MM-DD HH:MM:SS) without timezone
      // This matches how SQLite stores DATETIME columns and prevents timezone parsing issues
      const now = new Date();
      now.setMilliseconds(0); // Remove milliseconds
      const syncTimestamp = now.toISOString().replace('T', ' ').replace('.000Z', '');
      console.log(`🕐 Generated sync timestamp (SQLite format): ${syncTimestamp}`);

      // Update location's updated_at FIRST
      const updateSuccess = updateLocationById(locationId, { updated_at: syncTimestamp });
      console.log(`📝 Updated location ${locationId} updated_at: ${updateSuccess ? syncTimestamp : 'FAILED'}`);

      // Save sync state using the SAME timestamp
      PayloadSyncRepo.saveSyncState(
        locationId,
        collection,
        response.doc.id,
        "success",
        undefined, // no error message
        syncTimestamp // use the same timestamp
      );
      console.log(`💾 Saved sync state for location ${locationId} with timestamp: ${syncTimestamp}`);

      // Verify what was actually saved to the database
      const verifyLocation = this.locationQuery.getLocationById(locationId);
      const verifySyncState = PayloadSyncRepo.getSyncState(locationId, collection);
      console.log(`✅ VERIFICATION for location ${locationId}:`);
      console.log(`   DB location.updated_at: ${verifyLocation?.updated_at}`);
      console.log(`   DB syncState.last_synced_at: ${verifySyncState?.last_synced_at}`);
      console.log(`   Match: ${verifyLocation?.updated_at === verifySyncState?.last_synced_at}`);

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

    const results: SyncResult[] = [];

    for (const location of locations) {
      const result = await this.syncLocation(location.id!);
      results.push(result);

      // Small delay to avoid overwhelming Payload
      await new Promise(resolve => setTimeout(resolve, 500));
    }

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

      const collection = mapCategoryToCollection(location.category);
      const syncState = PayloadSyncRepo.getSyncState(locationId, collection);

      // Check if location has been modified since last successful sync
      const needsResync = this.hasLocationChangedSinceLastSync(location, syncState);

      return [{
        locationId,
        title: location.title || location.source.name,
        category: location.category,
        synced: !!syncState && syncState.sync_status === "success",
        needsResync,
        syncState: syncState || undefined,
      }];
    }

    // Get all locations with sync state
    const allLocations = this.locationQuery.listLocations();
    const allSyncStates = PayloadSyncRepo.getAllSyncedLocations();

    // Create a map for quick lookup
    const syncStateMap = new Map<number, any>();
    allSyncStates.forEach(state => {
      syncStateMap.set(state.location_id, state);
    });

    return allLocations.map(location => {
      const syncState = syncStateMap.get(location.id!);
      const needsResync = this.hasLocationChangedSinceLastSync(location, syncState);

      return {
        locationId: location.id!,
        title: location.title || location.source.name,
        category: location.category,
        synced: !!syncState && syncState.sync_status === "success",
        needsResync,
        syncState,
      };
    });
  }

  /**
   * Helper: Check if location has been modified since last successful sync
   */
  private hasLocationChangedSinceLastSync(location: any, syncState: any): boolean {
    // If there's no sync state or no successful sync, it doesn't need resync (needs initial sync)
    if (!syncState || syncState.sync_status !== "success") {
      console.log(`🔍 Location ${location.id}: No sync state or not successful - needsResync=false`);
      return false;
    }

    // If location has no updated_at, assume it hasn't changed
    if (!location.updated_at) {
      console.log(`🔍 Location ${location.id}: No updated_at - needsResync=false`);
      return false;
    }

    // Compare timestamps - if location was modified after last successful sync, it needs resync
    const lastModified = new Date(location.updated_at);
    const lastSynced = new Date(syncState.last_synced_at);

    console.log(`🔍 Location ${location.id} timestamp comparison:`);
    console.log(`   location.updated_at: ${location.updated_at} (Date: ${lastModified.toISOString()})`);
    console.log(`   syncState.last_synced_at: ${syncState.last_synced_at} (Date: ${lastSynced.toISOString()})`);
    console.log(`   needsResync: ${lastModified > lastSynced}`);

    return lastModified > lastSynced;
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

    return mapCategoryToCollection(location.category);
  }
}
