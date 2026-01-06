import {
  deleteLocationBySlug as deleteLocationBySlugRepo,
  deleteLocationById as deleteLocationByIdRepo,
  getLocationById,
  getLocationByIdForUpdate,
  getLocationBySlug
} from "../../repositories/core";
import type { ImageStorageService } from "@server/shared/services/storage/image-storage.service";

export class LocationMutationService {
  constructor(private readonly imageStorage: ImageStorageService) {}

  async deleteLocationBySlug(slug: string): Promise<boolean> {
    // 1. Fetch location to get sanitized name for file cleanup
    const location = getLocationBySlug(slug);
    if (!location) {
      return false;
    }

    const sanitizedName = this.imageStorage.sanitizeLocationName(location.name);

    // 2. Delete from database (repository handles cascade to embeds and uploads)
    const deleted = deleteLocationBySlugRepo(slug);
    if (!deleted) {
      return false;
    }

    // 3. Delete entire location folder from filesystem
    try {
      await this.imageStorage.deleteLocationFolder(sanitizedName);
    } catch (error) {
      // Log but don't throw - files may be orphaned, recoverable via admin cleanup
      console.error("File deletion failed for location", { slug, error });
    }

    return true;
  }

  async deleteLocationById(id: number): Promise<boolean> {
    // 1. Fetch location to get sanitized name for file cleanup
    const location = getLocationByIdForUpdate(id);
    if (!location) {
      return false;
    }

    const sanitizedName = this.imageStorage.sanitizeLocationName(location.name);

    // 2. Delete from database (repository handles cascade to embeds and uploads)
    const deleted = deleteLocationByIdRepo(id);
    if (!deleted) {
      return false;
    }

    // 3. Delete entire location folder from filesystem
    try {
      await this.imageStorage.deleteLocationFolder(sanitizedName);
    } catch (error) {
      // Log but don't throw - files may be orphaned, recoverable via admin cleanup
      console.error("File deletion failed for location", { id, error });
    }

    return true;
  }
}


