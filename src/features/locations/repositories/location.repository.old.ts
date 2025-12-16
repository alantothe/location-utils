import { getDb } from "../../../shared/db/client";
import type { LocationEntry } from "../models/location";
import { isLocationInScope } from "../utils/location-utils";

function mapRow(row: any): LocationEntry {
  return {
    ...row,
    images: row.images ? JSON.parse(row.images) : [],
    original_image_urls: row.original_image_urls ? JSON.parse(row.original_image_urls) : [],
    parent_id: row.parent_id || null,
    type: row.type || "maps",
    category: row.category || "attractions",
    dining_type: row.dining_type || null,
  };
}

/**
 * Validates that maps-type locations never have a parent_id set.
 * Throws an error if validation fails.
 */
function validateLocationParentId(location: LocationEntry): void {
  const locationType = location.type || "maps";

  if (locationType === "maps" && location.parent_id !== undefined && location.parent_id !== null) {
    throw new Error(
      `Validation Error: Map-type locations cannot have a parent_id. ` +
      `Attempted to set parent_id=${location.parent_id} for location "${location.name}"`
    );
  }

  if ((locationType === "instagram" || locationType === "upload") && !location.parent_id) {
    throw new Error(
      `Validation Error: ${locationType} entries must have a parent_id. ` +
      `Missing parent_id for "${location.name}"`
    );
  }
}

export function saveLocation(location: LocationEntry): number | boolean {
  try {
    // Validate parent_id rules before saving
    validateLocationParentId(location);

    const db = getDb();

    // Normalize parent_id: force null for maps, preserve for others
    const locationType = location.type || "maps";
    const normalizedParentId = locationType === "maps" ? null : (location.parent_id || null);

    const query = db.query(`
      INSERT INTO location (name, title, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category, dining_type, locationKey, contactAddress, countryCode, phoneNumber, website)
      VALUES ($name, $title, $address, $url, $embed_code, $instagram, $images, $lat, $lng, $original_image_urls, $parent_id, $type, $category, $dining_type, $locationKey, $contactAddress, $countryCode, $phoneNumber, $website)
      ON CONFLICT(name, address) DO UPDATE SET
        title = excluded.title,
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
        dining_type = excluded.dining_type,
        locationKey = excluded.locationKey,
        contactAddress = excluded.contactAddress,
        countryCode = excluded.countryCode,
        phoneNumber = excluded.phoneNumber,
        website = excluded.website,
        created_at = CURRENT_TIMESTAMP
    `);

    query.run({
      $name: location.name,
      $title: location.title || null,
      $address: location.address,
      $url: location.url,
      $embed_code: location.embed_code || null,
      $instagram: location.instagram || null,
      $images: location.images ? JSON.stringify(location.images) : null,
      $lat: location.lat || null,
      $lng: location.lng || null,
      $original_image_urls: location.original_image_urls ? JSON.stringify(location.original_image_urls) : null,
      $parent_id: normalizedParentId,
      $type: location.type || "maps",
      $category: location.category || "attractions",
      $dining_type: location.dining_type || null,
      $locationKey: location.locationKey || null,
      $contactAddress: location.contactAddress || null,
      $countryCode: location.countryCode || null,
      $phoneNumber: location.phoneNumber || null,
      $website: location.website || null,
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
    if (updates.title !== undefined) {
      setClause.push("title = $title");
      params.$title = updates.title;
    }
    if (updates.address !== undefined) {
      setClause.push("address = $address");
      params.$address = updates.address;
    }
    if (updates.category !== undefined) {
      setClause.push("category = $category");
      params.$category = updates.category;
    }
    if (updates.dining_type !== undefined) {
      setClause.push("dining_type = $dining_type");
      params.$dining_type = updates.dining_type;
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
    if (updates.locationKey !== undefined) {
      setClause.push("locationKey = $locationKey");
      params.$locationKey = updates.locationKey;
    }
    if (updates.contactAddress !== undefined) {
      setClause.push("contactAddress = $contactAddress");
      params.$contactAddress = updates.contactAddress;
    }
    if (updates.countryCode !== undefined) {
      setClause.push("countryCode = $countryCode");
      params.$countryCode = updates.countryCode;
    }
    if (updates.phoneNumber !== undefined) {
      setClause.push("phoneNumber = $phoneNumber");
      params.$phoneNumber = updates.phoneNumber;
    }
    if (updates.website !== undefined) {
      setClause.push("website = $website");
      params.$website = updates.website;
    }

    if (setClause.length === 0) {
      return false;
    }

    const query = db.query(`
      UPDATE location
      SET ${setClause.join(", ")}
      WHERE id = $id AND type = 'maps'
    `);

    (query as any).run(params);
    return true;
  } catch (error) {
    console.error("Error updating location:", error);
    return false;
  }
}

export function getAllLocations(): LocationEntry[] {
  const db = getDb();
  const query = db.query("SELECT id, name, title, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category, dining_type, locationKey, contactAddress, countryCode, phoneNumber, website FROM location ORDER BY created_at DESC");
  const rows = query.all() as any[];
  return rows.map(mapRow);
}

export function getLocationById(id: number): LocationEntry | null {
  const db = getDb();
  const query = db.query("SELECT id, name, title, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category, dining_type, locationKey, contactAddress, countryCode, phoneNumber, website FROM location WHERE id = $id");
  const row = query.get({ $id: id }) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getLocationsByParentId(parentId: number): LocationEntry[] {
  const db = getDb();
  const query = db.query("SELECT id, name, title, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category, dining_type, locationKey, contactAddress, countryCode, phoneNumber, website FROM location WHERE parent_id = $parentId ORDER BY created_at DESC");
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


/**
 * Get locations by location scope (useful for cascading filters)
 */
export function getLocationsInScope(locationKey: string): LocationEntry[] {
  if (!locationKey) {
    return [];
  }

  const allLocations = getAllLocations();
  return allLocations.filter(
    (loc) => loc.locationKey && isLocationInScope(loc.locationKey, locationKey)
  );
}
