import { getDb } from "@server/shared/db/client";
import type { Upload, LegacyUpload, ImageSetUpload } from "../../models/location";

/**
 * Maps a database row to the appropriate Upload type (legacy or imageset)
 * Uses uploadFormat column as discriminator
 */
function mapRow(row: any): Upload {
  const format = row.uploadFormat || 'legacy';

  if (format === 'imageset') {
    // Map to ImageSetUpload
    return {
      ...row,
      imageSets: row.imageSets ? JSON.parse(row.imageSets) : [],
      photographerCredit: row.photographerCredit || null,
      format: 'imageset',
    } as ImageSetUpload;
  } else {
    // Map to LegacyUpload
    return {
      ...row,
      images: row.images ? JSON.parse(row.images) : [],
      imageMetadata: row.imageMetadata ? JSON.parse(row.imageMetadata) : [],
      photographerCredit: row.photographerCredit || null,
      format: 'legacy',
    } as LegacyUpload;
  }
}

/**
 * Saves an upload to the database (supports both legacy and imageset formats)
 * Returns the upload ID on success, or false on failure
 */
export function saveUpload(upload: Upload): number | boolean {
  try {
    const db = getDb();

    if (upload.format === 'imageset') {
      // Handle ImageSetUpload format
      const imageSetUpload = upload as ImageSetUpload;

      if (imageSetUpload.id) {
        // Update existing
        const query = db.query(`
          UPDATE uploads
          SET photographerCredit = $photographerCredit,
              imageSets = $imageSets,
              uploadFormat = 'imageset'
          WHERE id = $id
        `);

        query.run({
          $id: imageSetUpload.id,
          $photographerCredit: imageSetUpload.photographerCredit || null,
          $imageSets: imageSetUpload.imageSets ? JSON.stringify(imageSetUpload.imageSets) : null,
        });

        return imageSetUpload.id;
      } else {
        // Insert new
        const query = db.query(`
          INSERT INTO uploads (location_id, photographerCredit, imageSets, uploadFormat)
          VALUES ($location_id, $photographerCredit, $imageSets, 'imageset')
        `);

        query.run({
          $location_id: imageSetUpload.location_id,
          $photographerCredit: imageSetUpload.photographerCredit || null,
          $imageSets: imageSetUpload.imageSets ? JSON.stringify(imageSetUpload.imageSets) : null,
        });

        const result = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
        return result.id;
      }
    } else {
      // Handle LegacyUpload format
      const legacyUpload = upload as LegacyUpload;

      if (legacyUpload.id) {
        // Update existing
        const query = db.query(`
          UPDATE uploads
          SET photographerCredit = $photographerCredit,
              images = $images,
              imageMetadata = $imageMetadata,
              uploadFormat = 'legacy'
          WHERE id = $id
        `);

        query.run({
          $id: legacyUpload.id,
          $photographerCredit: legacyUpload.photographerCredit || null,
          $images: legacyUpload.images ? JSON.stringify(legacyUpload.images) : null,
          $imageMetadata: legacyUpload.imageMetadata ? JSON.stringify(legacyUpload.imageMetadata) : null,
        });

        return legacyUpload.id;
      } else {
        // Insert new
        const query = db.query(`
          INSERT INTO uploads (location_id, photographerCredit, images, imageMetadata, uploadFormat)
          VALUES ($location_id, $photographerCredit, $images, $imageMetadata, 'legacy')
        `);

        query.run({
          $location_id: legacyUpload.location_id,
          $photographerCredit: legacyUpload.photographerCredit || null,
          $images: legacyUpload.images ? JSON.stringify(legacyUpload.images) : null,
          $imageMetadata: legacyUpload.imageMetadata ? JSON.stringify(legacyUpload.imageMetadata) : null,
        });

        const result = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
        return result.id;
      }
    }
  } catch (error) {
    console.error("Error saving upload to DB:", error);
    return false;
  }
}

export function getUploadById(id: number): Upload | null {
  const db = getDb();
  const query = db.query(`
    SELECT id, location_id, photographerCredit, images, imageMetadata, imageSets, uploadFormat, created_at
    FROM uploads
    WHERE id = $id
  `);
  const row = query.get({ $id: id }) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getUploadsByLocationId(locationId: number): Upload[] {
  const db = getDb();
  const query = db.query(`
    SELECT id, location_id, photographerCredit, images, imageMetadata, imageSets, uploadFormat, created_at
    FROM uploads
    WHERE location_id = $locationId
    ORDER BY created_at DESC
  `);
  const rows = query.all({ $locationId: locationId }) as any[];
  return rows.map(mapRow);
}

export function getAllUploads(): Upload[] {
  const db = getDb();
  const query = db.query(`
    SELECT id, location_id, photographerCredit, images, imageMetadata, imageSets, uploadFormat, created_at
    FROM uploads
    ORDER BY created_at DESC
  `);
  const rows = query.all() as any[];
  return rows.map(mapRow);
}

export function deleteUploadById(id: number): boolean {
  try {
    const db = getDb();
    const query = db.query("DELETE FROM uploads WHERE id = $id");
    query.run({ $id: id });
    return true;
  } catch (error) {
    console.error("Error deleting upload:", error);
    return false;
  }
}
