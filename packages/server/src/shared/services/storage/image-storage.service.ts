import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface ImageStorageConfig {
  baseDir: string;
  locationName: string;
  storageType: "instagram" | "uploads";
  timestamp: number;
}

export interface SaveImageResult {
  savedPaths: string[];
  errors: Array<{ index: number; error: string }>;
}

export class ImageStorageService {
  private readonly baseImagesDir: string;

  constructor(baseImagesDir: string = process.env.IMAGES_PATH || join(process.cwd(), "data/images")) {
    this.baseImagesDir = baseImagesDir;
  }

  /**
   * Generate a clean, filesystem-safe name from location name
   */
  sanitizeLocationName(locationName: string): string {
    return locationName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 30);
  }

  /**
   * Generate full storage path for a given configuration
   */
  generateStoragePath(config: ImageStorageConfig): string {
    const cleanName = this.sanitizeLocationName(config.locationName);
    return join(
      config.baseDir || this.baseImagesDir,
      cleanName,
      config.storageType,
      config.timestamp.toString()
    );
  }

  /**
   * Ensure directory structure exists
   */
  async ensureDirectoryExists(path: string): Promise<void> {
    const parts = path.replace(this.baseImagesDir, "").split("/").filter(Boolean);
    let current = this.baseImagesDir;

    // Ensure base directory exists
    if (!existsSync(current)) {
      await mkdir(current);
    }

    // Create each subdirectory
    for (const part of parts) {
      current = join(current, part);
      if (!existsSync(current)) {
        await mkdir(current);
      }
    }
  }

  /**
   * Save images from URLs to filesystem
   */
  async saveImagesFromUrls(
    imageUrls: string[],
    storagePath: string,
    fileExtension: string = "jpg"
  ): Promise<SaveImageResult> {
    await this.ensureDirectoryExists(storagePath);

    const savedPaths: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imgUrl = imageUrls[i];
      try {
        const imgRes = await fetch(imgUrl!);
        if (!imgRes.ok) {
          throw new Error(`HTTP ${imgRes.status}`);
        }

        const filename = `image_${i}.${fileExtension}`;
        const filePath = join(storagePath, filename);
        await Bun.write(filePath, await imgRes.blob());

        // Generate relative path from project root
        const relativePath = filePath.replace(process.cwd() + "/", "");
        savedPaths.push(relativePath);
      } catch (err) {
        errors.push({
          index: i,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return { savedPaths, errors };
  }

  /**
   * Save uploaded File objects to filesystem
   */
  async saveUploadedFiles(
    files: File[],
    storagePath: string
  ): Promise<SaveImageResult> {
    await this.ensureDirectoryExists(storagePath);

    const savedPaths: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) {
        errors.push({
          index: i,
          error: "File is undefined"
        });
        continue;
      }

      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `image_${i}.${ext}`;
        const filePath = join(storagePath, filename);
        await Bun.write(filePath, file);

        const relativePath = filePath.replace(process.cwd() + "/", "");
        savedPaths.push(relativePath);
      } catch (err) {
        errors.push({
          index: i,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return { savedPaths, errors };
  }

  /**
   * Read image file and return as Buffer
   */
  async readImage(filePath: string): Promise<Buffer> {
    // Handle both relative and absolute paths
    const absolutePath = filePath.startsWith("/")
      ? filePath
      : join(process.cwd(), filePath);

    const file = Bun.file(absolutePath);

    if (!await file.exists()) {
      throw new Error(`Image file not found: ${filePath}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
