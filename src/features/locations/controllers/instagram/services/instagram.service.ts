import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { AddInstagramRequest, InstagramEmbed } from "../../../models/location";
import { createFromInstagram, extractInstagramData } from "../../../services/location.helper";
import { getLocationById } from "../../../repositories/location.repository";
import { saveInstagramEmbed, getInstagramEmbedById } from "../../../repositories/instagram-embed.repository";

export async function addInstagramEmbed(payload: AddInstagramRequest): Promise<InstagramEmbed> {
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

  const { url: instaUrl, author } = extractInstagramData(embedCode);
  if (!instaUrl) {
    throw new Error("Invalid embed code");
  }

  // Validate that we can extract username from embed code
  if (!author) {
    throw new Error("Could not extract username from embed code. Please ensure you copied the complete Instagram embed code including the 'A post shared by' section.");
  }

  const entry = createFromInstagram(embedCode, locationId);
  const savedId = saveInstagramEmbed(entry);
  if (typeof savedId === "number") {
    entry.id = savedId;
  }

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

    const data: any = await apiResponse.json();
    const imageUrls: string[] = [];

    const getBestUrl = (candidates: Array<{ url: string }> | undefined) => {
      if (!candidates || candidates.length === 0) return null;
      return candidates[0]!.url;
    };

    if (data && data.media) {
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
    } else if (imageUrls.length === 0 && data && data.pictureUrl) {
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
          const imgRes = await fetch(imgUrl!);
          if (!imgRes.ok) throw new Error(`Failed to fetch ${imgUrl}`);

          const filename = `image_${i}.jpg`;
          const filePath = join(timestampDir, filename);
          await Bun.write(filePath, await imgRes.blob());
          savedPaths.push(`src/data/images/${cleanName}/instagram/${timestamp}/${filename}`);
        } catch (err) {
          console.error(`Error downloading image ${i + 1}:`, err);
        }
      }

      if (savedPaths.length > 0) {
        entry.images = savedPaths;
        entry.original_image_urls = imageUrls;
        saveInstagramEmbed(entry);
      }
    }
  } catch (error) {
    console.error("Error fetching from RapidAPI:", error);
  }

  if (typeof savedId === "number") {
    const saved = getInstagramEmbedById(savedId);
    if (saved) return saved;
  }
  return entry;
}
