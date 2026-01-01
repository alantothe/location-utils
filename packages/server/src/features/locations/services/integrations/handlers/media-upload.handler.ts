import type { LocationResponse } from "../../../models/location";
import type { PayloadApiClient } from "@server/shared/services/external/payload-api.client";
import { ImageStorageService } from "@server/shared/services/storage/image-storage.service";
import type { UploadedImagesResult } from "../types";
import { mapLocationKeyToPayloadLocation } from "../mappers";

/**
 * Upload images and create Instagram posts for a location
 * Returns separate arrays for gallery images and Instagram post IDs
 */
export async function uploadLocationImages(
  location: LocationResponse,
  payloadClient: PayloadApiClient,
  imageStorage: ImageStorageService
): Promise<UploadedImagesResult> {
  const galleryImageIds: string[] = [];
  const instagramPostIds: string[] = [];

  try {
    // Upload direct upload images (ALL images go to gallery)
    for (const upload of location.uploads) {
      // Handle discriminated union: LegacyUpload vs ImageSetUpload
      if (upload.format === 'legacy' && upload.images && upload.images.length > 0) {
        // Legacy format: direct image paths
        for (const imagePath of upload.images) {
          try {
            const imageBuffer = await imageStorage.readImage(imagePath);
            const filename = imagePath.split("/").pop() || "image.jpg";
            const altText = upload.photographerCredit ?
              `Photo by ${upload.photographerCredit}` :
              location.title || location.source.name;

            const mediaAssetId = await payloadClient.uploadImage(
              imageBuffer,
              filename,
              altText,
              mapLocationKeyToPayloadLocation(location.locationKey || undefined)
            );

            galleryImageIds.push(mediaAssetId);
          } catch (error) {
            console.warn(`⚠️  Failed to upload image ${imagePath}:`, error);
            // Continue with other images
          }
        }
      } else if (upload.format === 'imageset' && upload.imageSets && upload.imageSets.length > 0) {
        // ImageSet format: extract paths from ImageSet objects
        for (const imageSet of upload.imageSets) {
          const imagePath = imageSet.sourceImage.path;
          try {
            const imageBuffer = await imageStorage.readImage(imagePath);
            const filename = imagePath.split("/").pop() || "image.jpg";
            const altText = upload.photographerCredit ?
              `Photo by ${upload.photographerCredit}` :
              location.title || location.source.name;

            const mediaAssetId = await payloadClient.uploadImage(
              imageBuffer,
              filename,
              altText,
              mapLocationKeyToPayloadLocation(location.locationKey || undefined)
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
          const imageBuffer = await imageStorage.readImage(previewImagePath);
          const filename = previewImagePath.split("/").pop() || "instagram.jpg";
          const altText = `Instagram post by ${embed.username}`;

          previewMediaAssetId = await payloadClient.uploadImage(
            imageBuffer,
            filename,
            altText,
            mapLocationKeyToPayloadLocation(location.locationKey || undefined)
          );

          console.log(`✓ Uploaded Instagram preview image: ${previewMediaAssetId}`);

          // Step 2: Create Instagram post with preview image
          const postTitle = createInstagramPostTitle(embed.username, location);
          const instagramPostId = await payloadClient.createInstagramPost({
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
export function createInstagramPostTitle(username: string, location: LocationResponse): string {
  const locationName = location.title || location.source.name;
  const cleanUsername = username.replace(/^@/, "");
  return `@${cleanUsername} at ${locationName}`;
}
