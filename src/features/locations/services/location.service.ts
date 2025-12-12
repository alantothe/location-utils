import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type {
  AddInstagramRequest,
  CreateMapsRequest,
  LocationEntry,
  LocationWithChildren,
  UpdateMapsRequest,
} from "../models/location";
import {
  createFromInstagram,
  createFromMaps,
  createFromUpload,
  extractInstagramData,
  generateGoogleMapsUrl,
  geocode,
} from "./location.factory";
import {
  clearDatabase,
  getAllLocations,
  getLocationById,
  getLocationsByParentId,
  saveLocation,
  updateLocationById,
} from "../repositories/location.repository";

const VALID_CATEGORIES = ["dining", "accommodations", "attractions", "nightlife"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;

export function listLocations(): LocationWithChildren[] {
  const allLocations = getAllLocations();
  const mainLocations = allLocations.filter((loc) => loc.type === "maps" || !loc.parent_id);

  return mainLocations.map((loc) => {
    const instagramEmbeds = allLocations.filter((embed) => embed.parent_id === loc.id && embed.type === "instagram");
    const uploadEntries = allLocations.filter((entry) => entry.parent_id === loc.id && entry.type === "upload");

    return {
      ...loc,
      instagram_embeds: instagramEmbeds,
      uploads: uploadEntries,
    };
  });
}

export async function addMapsLocation(payload: CreateMapsRequest, apiKey?: string): Promise<LocationEntry> {
  if (!payload.name || !payload.address) {
    throw new Error("Name and Address required");
  }

  const category = payload.category && VALID_CATEGORIES.includes(payload.category) ? payload.category : "attractions";
  const entry = await createFromMaps(payload.name, payload.address, apiKey, category);
  saveLocation(entry);
  return entry;
}

export async function updateMapsLocation(payload: UpdateMapsRequest, apiKey?: string): Promise<LocationEntry> {
  if (!payload.id || !payload.name || !payload.address) {
    throw new Error("ID, Name and Address required");
  }

  const currentLocation = getLocationById(payload.id);
  if (!currentLocation || currentLocation.type !== "maps") {
    throw new Error("Location not found or cannot be edited");
  }

  const category = payload.category && VALID_CATEGORIES.includes(payload.category) ? payload.category : "attractions";
  const newUrl = generateGoogleMapsUrl(payload.name, payload.address);

  let lat = currentLocation.lat;
  let lng = currentLocation.lng;
  if (apiKey && payload.address !== currentLocation.address) {
    try {
      const coords = await geocode(payload.address, apiKey);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    } catch (e) {
      console.warn("Failed to geocode updated address:", e);
    }
  }

  const success = updateLocationById(payload.id, {
    name: payload.name,
    address: payload.address,
    category,
    url: newUrl,
    lat,
    lng,
  });

  if (!success) {
    throw new Error("Failed to update location");
  }

  const updatedLocation = getLocationById(payload.id);
  if (!updatedLocation) {
    throw new Error("Location not found after update");
  }

  return updatedLocation;
}

export async function addInstagramEmbed(payload: AddInstagramRequest): Promise<LocationEntry> {
  const { embedCode, locationId } = payload;
  if (!embedCode) {
    throw new Error("Embed code required");
  }
  if (!locationId) {
    throw new Error("Location ID required");
  }

  const parentLocation = getLocationById(locationId);
  if (!parentLocation) {
    throw new Error("Parent location not found");
  }

  const { url: instaUrl } = extractInstagramData(embedCode);
  if (!instaUrl) {
    throw new Error("Invalid embed code");
  }

  const entry = createFromInstagram(embedCode, locationId);
  const savedId = saveLocation(entry);

  const timestamp = Date.now();
  const cleanName = parentLocation.name.replace(/[^a-z0-9]/gi, "_").toLowerCase().substring(0, 30);
  const baseImagesDir = join(process.cwd(), "images");
  const locationDir = join(baseImagesDir, cleanName);
  const typeDir = join(locationDir, "instagram");
  const timestampDir = join(typeDir, timestamp.toString());

  try {
    const apiResponse = await fetch("https://instagram120.p.rapidapi.com/api/instagram/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "instagram120.p.rapidapi.com",
        "x-rapidapi-key": "3e4f70dd00mshb714e256435f6e3p15c503jsn0c5a2df22416",
      },
      body: JSON.stringify({ url: instaUrl }),
    });

    const data = await apiResponse.json();
    const imageUrls: string[] = [];

    const getBestUrl = (candidates: Array<{ url: string }> | undefined) => {
      if (!candidates || candidates.length === 0) return null;
      return candidates[0].url;
    };

    if (data.media) {
      if (data.media.carousel_media) {
        data.media.carousel_media.forEach((item: any) => {
          if (item.image_versions2 && item.image_versions2.candidates) {
            const url = getBestUrl(item.image_versions2.candidates);
            if (url) imageUrls.push(url);
          }
        });
      } else if (data.media.image_versions2 && data.media.image_versions2.candidates) {
        const url = getBestUrl(data.media.image_versions2.candidates);
        if (url) imageUrls.push(url);
      }
    }

    if (imageUrls.length === 0 && Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item.pictureUrl) imageUrls.push(item.pictureUrl);
      });
    } else if (imageUrls.length === 0 && data.pictureUrl) {
      imageUrls.push(data.pictureUrl);
    }

    if (imageUrls.length > 0) {
      if (!existsSync(baseImagesDir)) await mkdir(baseImagesDir);
      if (!existsSync(locationDir)) await mkdir(locationDir);
      if (!existsSync(typeDir)) await mkdir(typeDir);
      if (!existsSync(timestampDir)) await mkdir(timestampDir);

      const savedPaths: string[] = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const imgUrl = imageUrls[i];
        try {
          const imgRes = await fetch(imgUrl);
          if (!imgRes.ok) throw new Error(`Failed to fetch ${imgUrl}`);

          const filename = `image_${i}.jpg`;
          const filePath = join(timestampDir, filename);
          await Bun.write(filePath, await imgRes.blob());
          savedPaths.push(`images/${cleanName}/instagram/${timestamp}/${filename}`);
        } catch (err) {
          console.error(`Error downloading image ${i + 1}:`, err);
        }
      }

      if (savedPaths.length > 0) {
        entry.images = savedPaths;
        entry.original_image_urls = imageUrls;
        saveLocation(entry);
      }
    }
  } catch (error) {
    console.error("Error fetching from RapidAPI:", error);
  }

  if (typeof savedId === "number") {
    const saved = getLocationById(savedId);
    if (saved) return saved;
  }
  return entry;
}

export async function addUploadFiles(parentId: number, files: File[]): Promise<LocationEntry> {
  if (!parentId) throw new Error("Location ID required");

  const parentLocation = getLocationById(parentId);
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
  const entry = createFromUpload(parentId, timestamp);
  saveLocation(entry);

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
    savedPaths.push(`images/${cleanName}/uploads/${timestamp}/${filename}`);
  }

  if (savedPaths.length > 0) {
    entry.images = savedPaths;
    saveLocation(entry);
  }

  return entry;
}

export function openFolder(folderPath: string) {
  if (!folderPath) throw new Error("Folder path required");
  const fullPath = join(process.cwd(), folderPath);
  if (!fullPath.startsWith(process.cwd())) {
    throw new Error("Invalid path");
  }
  Bun.spawn(["open", fullPath]);
}

export function wipeDatabase() {
  return clearDatabase();
}

export function getChildLocations(parentId: number) {
  return getLocationsByParentId(parentId);
}
