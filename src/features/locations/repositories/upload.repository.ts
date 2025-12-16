import { getDb } from "../../../shared/db/client";
import type { Upload } from "../models/location";

function mapRow(row: any): Upload {
  return {
    ...row,
    images: row.images ? JSON.parse(row.images) : [],
    photographerCredit: row.photographerCredit || null,
  };
}

export function saveUpload(upload: Upload): number | boolean {
  try {
    const db = getDb();

    if (upload.id) {
      // Update existing upload
      const query = db.query(`
        UPDATE uploads
        SET photographerCredit = $photographerCredit,
            images = $images
        WHERE id = $id
      `);

      query.run({
        $id: upload.id,
        $photographerCredit: upload.photographerCredit || null,
        $images: upload.images ? JSON.stringify(upload.images) : null,
      });

      return upload.id;
    } else {
      // Insert new upload
      const query = db.query(`
        INSERT INTO uploads (location_id, photographerCredit, images)
        VALUES ($location_id, $photographerCredit, $images)
      `);

      query.run({
        $location_id: upload.location_id,
        $photographerCredit: upload.photographerCredit || null,
        $images: upload.images ? JSON.stringify(upload.images) : null,
      });

      const result = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
      return result.id;
    }
  } catch (error) {
    console.error("Error saving upload to DB:", error);
    return false;
  }
}

export function getUploadById(id: number): Upload | null {
  const db = getDb();
  const query = db.query(`
    SELECT id, location_id, photographerCredit, images, created_at
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
    SELECT id, location_id, photographerCredit, images, created_at
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
    SELECT id, location_id, photographerCredit, images, created_at
    FROM uploads
    ORDER BY created_at DESC
  `);
  const rows = query.all() as any[];
  return rows.map(mapRow);
}

export function deleteUploadById(id: number): boolean {
  try {
    const db = getDb();
    db.run("DELETE FROM uploads WHERE id = $id", { $id: id });
    return true;
  } catch (error) {
    console.error("Error deleting upload:", error);
    return false;
  }
}
