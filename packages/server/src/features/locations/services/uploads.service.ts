import type { Upload, ImageMetadata, ImageSetUpload } from "../models/location";
import type { ImageVariantType, ImageSet, ImageVariant, VARIANT_SPECS } from "@url-util/shared";
import { BadRequestError, NotFoundError } from "@shared/errors/http-error";
import { ImageStorageService } from "@server/shared/services/storage/image-storage.service";
import { getLocationById } from "../repositories/location.repository";
import { saveUpload } from "../repositories/upload.repository";
import { createFromUpload, createFromImageSetUpload } from "./location.helper";
import { extractImageMetadata } from "../utils/image-metadata-extractor";
import { join } from "node:path";
import { VARIANT_SPECS as VARIANT_SPECS_IMPORT } from "@url-util/shared";

export class UploadsService {
  constructor(
    private readonly imageStorage: ImageStorageService
  ) {}

  async addUploadFiles(
    locationId: number,
    files: File[],
    photographerCredit?: string | null
  ): Promise<Upload> {
    if (!locationId) {
      throw new BadRequestError("Location ID required");
    }

    const parentLocation = getLocationById(locationId);
    if (!parentLocation) {
      throw new NotFoundError("Location", locationId);
    }

    if (!files || files.length === 0) {
      throw new BadRequestError("No files provided");
    }

    const timestamp = Date.now();
    const entry = createFromUpload(locationId, photographerCredit);
    const savedId = saveUpload(entry);

    if (typeof savedId === 'number') {
      entry.id = savedId;
    } else {
      throw new Error("Failed to save upload entry");
    }

    const storagePath = this.imageStorage.generateStoragePath({
      baseDir: this.imageStorage["baseImagesDir"],
      locationName: parentLocation.name,
      storageType: "uploads",
      timestamp
    });

    const { savedPaths, errors } = await this.imageStorage.saveUploadedFiles(
      files,
      storagePath
    );

    if (errors.length > 0) {
      console.warn("Some files failed to upload:", errors);
    }

    if (savedPaths.length > 0) {
      entry.images = savedPaths;

      // Extract metadata for each saved image
      const metadata: ImageMetadata[] = [];
      for (const path of savedPaths) {
        // Construct absolute path - savedPaths are relative to cwd
        const fullPath = join(process.cwd(), path);
        try {
          console.log(`Extracting metadata from: ${fullPath}`);
          const meta = await extractImageMetadata(fullPath);
          console.log(`Metadata extracted:`, meta);
          metadata.push(meta);
        } catch (error) {
          console.error(`Failed to extract metadata for ${path}:`, error);
          // Push default metadata on error
          metadata.push({
            width: 0,
            height: 0,
            size: 0,
            format: "unknown",
          });
        }
      }

      entry.imageMetadata = metadata;
      saveUpload(entry);
    }

    return entry;
  }

  /**
   * Add a new multi-variant image set upload
   * @param locationId - Parent location ID
   * @param sourceFile - Original source image file
   * @param variantFiles - Array of 5 variant files (thumbnail, square, wide, portrait, hero)
   * @param photographerCredit - Optional photographer attribution
   * @returns ImageSetUpload with all variants saved
   */
  async addImageSetUpload(
    locationId: number,
    sourceFile: File,
    variantFiles: { type: ImageVariantType; file: File }[],
    photographerCredit?: string | null
  ): Promise<ImageSetUpload> {
    // 1. Validate inputs
    if (!locationId) {
      throw new BadRequestError("Location ID required");
    }

    const parentLocation = getLocationById(locationId);
    if (!parentLocation) {
      throw new NotFoundError("Location", locationId);
    }

    if (!sourceFile) {
      throw new BadRequestError("Source file required");
    }

    if (!variantFiles || variantFiles.length !== 5) {
      throw new BadRequestError("Exactly 5 variant files required (thumbnail, square, wide, portrait, hero)");
    }

    // Validate all variant types are present
    const requiredTypes: ImageVariantType[] = ['thumbnail', 'square', 'wide', 'portrait', 'hero'];
    const providedTypes = new Set(variantFiles.map(v => v.type));

    for (const type of requiredTypes) {
      if (!providedTypes.has(type)) {
        throw new BadRequestError(`Missing variant type: ${type}`);
      }
    }

    // 2. Create timestamp-based ID and entry
    const timestamp = Date.now();
    const imageSetId = `${timestamp}`;
    const entry = createFromImageSetUpload(locationId, photographerCredit);

    // Save entry to get database ID
    const savedId = saveUpload(entry);
    if (typeof savedId === 'number') {
      entry.id = savedId;
    } else {
      throw new Error("Failed to save upload entry");
    }

    // 3. Generate storage path
    const storagePath = this.imageStorage.generateStoragePath({
      baseDir: this.imageStorage["baseImagesDir"],
      locationName: parentLocation.name,
      storageType: "uploads",
      timestamp
    });

    // Ensure directory exists
    await this.imageStorage.ensureDirectoryExists(storagePath);

    // 4. Save source file
    const sourceFileName = `source_0.${this.getFileExtension(sourceFile.name)}`;
    const sourceFilePath = join(storagePath, sourceFileName);

    try {
      await this.saveFileToPath(sourceFile, sourceFilePath);
    } catch (error) {
      console.error("Failed to save source file:", error);
      throw new BadRequestError("Failed to save source file");
    }

    // 5. Extract source metadata
    const sourceMeta = await this.extractMetadataFromFile(sourceFilePath);

    // 6. Save all variant files and extract metadata
    const variants: ImageVariant[] = [];

    for (const { type, file } of variantFiles) {
      const spec = VARIANT_SPECS_IMPORT[type];
      const variantFileName = `0_${type}.${this.getFileExtension(file.name)}`;
      const variantFilePath = join(storagePath, variantFileName);

      try {
        await this.saveFileToPath(file, variantFilePath);

        const meta = await this.extractMetadataFromFile(variantFilePath);

        // Get relative path from cwd
        const relativePath = variantFilePath.replace(process.cwd() + "/", "");

        variants.push({
          type,
          aspectRatio: spec.label,
          dimensions: {
            width: meta.width,
            height: meta.height,
          },
          path: relativePath,
          size: meta.size,
          format: meta.format,
        });
      } catch (error) {
        console.error(`Failed to save variant ${type}:`, error);
        throw new BadRequestError(`Failed to save variant: ${type}`);
      }
    }

    // 7. Construct ImageSet object
    const relativeSourcePath = sourceFilePath.replace(process.cwd() + "/", "");

    const imageSet: ImageSet = {
      id: imageSetId,
      sourceImage: {
        path: relativeSourcePath,
        dimensions: {
          width: sourceMeta.width,
          height: sourceMeta.height,
        },
        size: sourceMeta.size,
        format: sourceMeta.format,
      },
      variants,
      photographerCredit: photographerCredit || null,
      created_at: new Date().toISOString(),
    };

    // 8. Update entry with ImageSet and save to database
    entry.imageSets = [imageSet];
    saveUpload(entry);

    return entry;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts[parts.length - 1] || 'jpg';
  }

  /**
   * Save a File object to a specific path
   */
  private async saveFileToPath(file: File, filePath: string): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await Bun.write(filePath, buffer);
  }

  /**
   * Extract metadata from a file at the given path
   */
  private async extractMetadataFromFile(filePath: string): Promise<ImageMetadata> {
    try {
      const fullPath = join(process.cwd(), filePath);
      const meta = await extractImageMetadata(fullPath);
      return meta;
    } catch (error) {
      console.error(`Failed to extract metadata for ${filePath}:`, error);
      return {
        width: 0,
        height: 0,
        size: 0,
        format: "unknown",
      };
    }
  }
}
