import { getDb } from "../../../shared/db/client";
import type { LocationEntry } from "../models/location";

function mapRow(row: any): LocationEntry {
  return {
    ...row,
    instagram: row.instagram || null,
    images: row.images ? JSON.parse(row.images) : [],
    original_image_urls: row.original_image_urls ? JSON.parse(row.original_image_urls) : [],
    parent_id: row.parent_id || null,
    type: row.type || "maps",
    category: row.category || "attractions",
  };
}

export function saveLocation(location: LocationEntry): number | boolean {
  try {
    const db = getDb();
    const query = db.query(`
      INSERT INTO location (name, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category)
      VALUES ($name, $address, $url, $embed_code, $instagram, $images, $lat, $lng, $original_image_urls, $parent_id, $type, $category)
      ON CONFLICT(name, address) DO UPDATE SET
        url = excluded.url,
        embed_code = excluded.embed_code,
        instagram = excluded.instagram,
        images = excluded.images,
        lat = excluded.lat,
        lng = excluded.lng,
        original_image_urls = excluded.original_image_urls,
        parent_id = excluded.parent_id,
        type = excluded.type,
        category = excluded.category,
        created_at = CURRENT_TIMESTAMP
    `);

    query.run({
      $name: location.name,
      $address: location.address,
      $url: location.url,
      $embed_code: location.embed_code || null,
      $instagram: location.instagram || null,
      $images: location.images ? JSON.stringify(location.images) : null,
      $lat: location.lat || null,
      $lng: location.lng || null,
      $original_image_urls: location.original_image_urls ? JSON.stringify(location.original_image_urls) : null,
      $parent_id: location.parent_id || null,
      $type: location.type || "maps",
      $category: location.category || "attractions",
    });

    const result = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return result.id;
  } catch (error) {
    console.error("Error saving location to DB:", error);
    return false;
  }
}

export function updateLocationById(id: number, updates: Partial<LocationEntry>): boolean {
  try {
    const db = getDb();
    const setClause: string[] = [];
    const params: Record<string, unknown> = { $id: id };

    if (updates.name !== undefined) {
      setClause.push("name = $name");
      params.$name = updates.name;
    }
    if (updates.address !== undefined) {
      setClause.push("address = $address");
      params.$address = updates.address;
    }
    if (updates.category !== undefined) {
      setClause.push("category = $category");
      params.$category = updates.category;
    }
    if (updates.url !== undefined) {
      setClause.push("url = $url");
      params.$url = updates.url;
    }
    if (updates.lat !== undefined) {
      setClause.push("lat = $lat");
      params.$lat = updates.lat;
    }
    if (updates.lng !== undefined) {
      setClause.push("lng = $lng");
      params.$lng = updates.lng;
    }

    if (setClause.length === 0) {
      return false;
    }

    const query = db.query(`
      UPDATE location
      SET ${setClause.join(", ")}
      WHERE id = $id AND type = 'maps'
    `);

    query.run(params);
    return true;
  } catch (error) {
    console.error("Error updating location:", error);
    return false;
  }
}

export function getAllLocations(): LocationEntry[] {
  const db = getDb();
  const query = db.query("SELECT id, name, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category FROM location ORDER BY created_at DESC");
  const rows = query.all() as any[];
  return rows.map(mapRow);
}

export function getLocationById(id: number): LocationEntry | null {
  const db = getDb();
  const query = db.query("SELECT id, name, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category FROM location WHERE id = $id");
  const row = query.get({ $id: id }) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getLocationsByParentId(parentId: number): LocationEntry[] {
  const db = getDb();
  const query = db.query("SELECT id, name, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category FROM location WHERE parent_id = $parentId ORDER BY created_at DESC");
  const rows = query.all({ $parentId: parentId }) as any[];
  return rows.map(mapRow);
}

export function clearDatabase() {
  try {
    const db = getDb();
    db.run("DELETE FROM location");
    db.run("VACUUM");
    return true;
  } catch (error) {
    console.error("Error clearing database:", error);
    return false;
  }
}
