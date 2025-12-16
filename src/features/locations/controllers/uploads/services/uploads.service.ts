import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Upload } from "../../../models/location";
import { getLocationById } from "../../../repositories/location.repository";
import { saveUpload } from "../../../repositories/upload.repository";
import { createFromUpload } from "../../../services/location.helper";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;

export async function addUploadFiles(
  locationId: number,
  files: File[],
  photographerCredit?: string | null
): Promise<Upload> {
  if (!locationId) throw new Error("Location ID required");

  const parentLocation = getLocationById(locationId);
  if (!parentLocation) {
    throw new Error("Parent location not found");
  }

  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }

  let totalSize = 0;
  for (const file of files) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type for "${file.name}". Only JPEG, PNG, WebP, and GIF images are allowed.`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File "${file.name}" exceeds 10MB limit.`);
    }

    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error("Total upload size exceeds 50MB limit.");
  }

  if (files.length > MAX_FILES) {
    throw new Error("Maximum 20 files allowed per upload.");
  }

  const timestamp = Date.now();
  const entry = createFromUpload(locationId, photographerCredit);
  const savedId = saveUpload(entry);
  if (typeof savedId === 'number') {
    entry.id = savedId;
  } else {
    throw new Error("Failed to save upload entry");
  }

  const cleanName = parentLocation.name.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 30);
  const baseImagesDir = join(process.cwd(), "images");
  const locationDir = join(baseImagesDir, cleanName);
  const typeDir = join(locationDir, "uploads");
  const timestampDir = join(typeDir, timestamp.toString());

  if (!existsSync(baseImagesDir)) await mkdir(baseImagesDir);
  if (!existsSync(locationDir)) await mkdir(locationDir);
  if (!existsSync(typeDir)) await mkdir(typeDir);
  if (!existsSync(timestampDir)) await mkdir(timestampDir);

  const savedPaths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i] as File;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `image_${i}.${ext}`;
    const filePath = join(timestampDir, filename);
    await Bun.write(filePath, file);
    savedPaths.push(`src/data/images/${cleanName}/uploads/${timestamp}/${filename}`);
  }

  if (savedPaths.length > 0) {
    entry.images = savedPaths;
    saveUpload(entry);
  }

  return entry;
}
