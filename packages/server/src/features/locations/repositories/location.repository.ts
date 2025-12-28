import { getDb } from "@server/shared/db/client";
import type { Location } from "../models/location";
import { isLocationInScope } from "../utils/location-utils";
import { slugifyLocationPart } from "../services/location.helper";

function mapRow(row: any): Location {
  return {
    ...row,
  };
}

export function saveLocation(location: Location): number | boolean {
  // Generate slug if not provided
  if (!location.slug && location.name) {
    location.slug = slugifyLocationPart(location.name);
  }

  try {
    const db = getDb();
    const query = db.query(`
      INSERT INTO locations (name, title, address, url, lat, lng, category, locationKey, district, contactAddress, countryCode, phoneNumber, website, slug)
      VALUES ($name, $title, $address, $url, $lat, $lng, $category, $locationKey, $district, $contactAddress, $countryCode, $phoneNumber, $website, $slug)
      ON CONFLICT(name, address) DO UPDATE SET
        title = excluded.title,
        url = excluded.url,
        lat = excluded.lat,
        lng = excluded.lng,
        category = excluded.category,
        locationKey = excluded.locationKey,
        district = excluded.district,
        contactAddress = excluded.contactAddress,
        countryCode = excluded.countryCode,
        phoneNumber = excluded.phoneNumber,
        website = excluded.website,
        slug = excluded.slug,
        created_at = CURRENT_TIMESTAMP
    `);

    query.run({
      $name: location.name,
      $title: location.title || null,
      $address: location.address,
      $url: location.url,
      $lat: location.lat || null,
      $lng: location.lng || null,
      $category: location.category || "attractions",
      $locationKey: location.locationKey || null,
      $district: location.district || null,
      $contactAddress: location.contactAddress || null,
      $countryCode: location.countryCode || null,
      $phoneNumber: location.phoneNumber || null,
      $website: location.website || null,
      $slug: location.slug || null,
    });

    const result = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return result.id;
  } catch (error) {
    console.error("Error saving location to DB:", error);
    return false;
  }
}

export function updateLocationById(id: number, updates: Partial<Location>): boolean {
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
    if (updates.district !== undefined) {
      setClause.push("district = $district");
      params.$district = updates.district;
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
      UPDATE locations
      SET ${setClause.join(", ")}
      WHERE id = $id
    `);

    (query as any).run(params);
    return true;
  } catch (error) {
    console.error("Error updating location:", error);
    return false;
  }
}

export function getAllLocations(): Location[] {
  const db = getDb();
  const query = db.query(`
    SELECT DISTINCT l.id, l.name, l.title, l.address, l.url, l.lat, l.lng,
           l.category, l.locationKey, l.district, l.contactAddress,
           l.countryCode, l.phoneNumber, l.website, l.slug, l.created_at
    FROM locations l
    LEFT JOIN location_taxonomy t ON l.locationKey = t.locationKey
    WHERE l.locationKey IS NULL OR t.status = 'approved'
    ORDER BY l.created_at DESC
  `);
  const rows = query.all() as any[];
  return rows.map(mapRow);
}

export function getLocationsByCategory(category: string): Location[] {
  const db = getDb();
  const query = db.query(`
    SELECT DISTINCT l.id, l.name, l.title, l.address, l.url, l.lat, l.lng,
           l.category, l.locationKey, l.district, l.contactAddress,
           l.countryCode, l.phoneNumber, l.website, l.slug, l.created_at
    FROM locations l
    LEFT JOIN location_taxonomy t ON l.locationKey = t.locationKey
    WHERE l.category = $category
      AND (l.locationKey IS NULL OR t.status = 'approved')
    ORDER BY l.created_at DESC
  `);
  const rows = query.all({ $category: category }) as any[];
  return rows.map(mapRow);
}

export function getLocationById(id: number): Location | null {
  const db = getDb();
  const query = db.query(`
    SELECT DISTINCT l.id, l.name, l.title, l.address, l.url, l.lat, l.lng,
           l.category, l.locationKey, l.district, l.contactAddress,
           l.countryCode, l.phoneNumber, l.website, l.slug, l.created_at
    FROM locations l
    LEFT JOIN location_taxonomy t ON l.locationKey = t.locationKey
    WHERE l.id = $id
      AND (l.locationKey IS NULL OR t.status = 'approved')
  `);
  const row = query.get({ $id: id }) as any;
  if (!row) return null;
  return mapRow(row);
}

export function getLocationBySlug(slug: string): Location | null {
  const db = getDb();
  const query = db.query("SELECT id, name, title, address, url, lat, lng, category, locationKey, district, contactAddress, countryCode, phoneNumber, website, slug, created_at FROM locations WHERE slug = $slug");
  const row = query.get({ $slug: slug }) as any;
  if (!row) return null;
  return mapRow(row);
}

export function clearDatabase() {
  try {
    const db = getDb();
    db.run("DELETE FROM locations");
    db.run("DELETE FROM instagram_embeds");
    db.run("DELETE FROM uploads");
    db.run("VACUUM");
    return true;
  } catch (error) {
    console.error("Error clearing database:", error);
    return false;
  }
}

export function deleteLocationById(id: number): boolean {
  try {
    const db = getDb();

    // First get the location to check if it exists
    const location = getLocationById(id);
    if (!location) {
      return false;
    }

    // Delete related instagram_embeds
    db.run("DELETE FROM instagram_embeds WHERE location_id = ?", id);

    // Delete related uploads
    db.run("DELETE FROM uploads WHERE location_id = ?", id);

    // Delete the location itself
    const deleteStmt = db.query("DELETE FROM locations WHERE id = $id");
    const result = deleteStmt.run({ $id: id });

    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting location by id:", error);
    return false;
  }
}

export function deleteLocationBySlug(slug: string): boolean {
  try {
    const db = getDb();

    // First get the location to check if it exists
    const location = getLocationBySlug(slug);
    if (!location || !location.id) {
      return false;
    }

    // Delete related instagram_embeds
    db.run("DELETE FROM instagram_embeds WHERE location_id = ?", location.id);

    // Delete related uploads
    db.run("DELETE FROM uploads WHERE location_id = ?", location.id);

    // Delete the location itself
    const deleteStmt = db.query("DELETE FROM locations WHERE slug = $slug");
    const result = deleteStmt.run({ $slug: slug });

    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting location by slug:", error);
    return false;
  }
}

/**
 * Get locations by location scope (useful for cascading filters)
 */
export function getLocationsInScope(locationKey: string): Location[] {
  if (!locationKey) {
    return [];
  }

  const allLocations = getAllLocations();
  return allLocations.filter(
    (loc) => loc.locationKey && isLocationInScope(loc.locationKey, locationKey)
  );
}
