import type { LocationCategory } from "../../../models/location";
import type { PayloadSyncState } from "../../../repositories/integration";

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

export interface UploadedImagesResult {
  galleryImageIds: string[];      // MediaAsset IDs for regular uploads
  instagramPostIds: string[];     // Instagram post IDs for embeds
}


