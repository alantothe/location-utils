import { Database } from "bun:sqlite";

const db = new Database("location.sqlite");

// Initialize the table
db.run(`
  CREATE TABLE IF NOT EXISTS location (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    url TEXT NOT NULL,
    embed_code TEXT,
    instagram TEXT,
    images TEXT,
    lat REAL,
    lng REAL,
    original_image_urls TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, address)
  )
`);

  // Add images column if it doesn't exist (migration)
  try {
    db.run("ALTER TABLE location ADD COLUMN images TEXT");
} catch (e) {
  // Column likely already exists, ignore error
}

// Add lat/lng columns if they don't exist (migration)
try {
  db.run("ALTER TABLE location ADD COLUMN lat REAL");
  db.run("ALTER TABLE location ADD COLUMN lng REAL");
} catch (e) {
  // Columns likely already exist
}

// Add original_image_urls column (migration)
try {
  db.run("ALTER TABLE location ADD COLUMN original_image_urls TEXT");
} catch (e) {
  // Column likely already exists
}

// Add instagram column if it doesn't exist (migration)
try {
  db.run("ALTER TABLE location ADD COLUMN instagram TEXT");
} catch (e) {
  // Column likely already exists
}

// Add parent_id column for hierarchical relationship (migration)
try {
  db.run("ALTER TABLE location ADD COLUMN parent_id INTEGER");
} catch (e) {
  // Column likely already exists
}

// Add type column to distinguish maps vs instagram entries (migration)
try {
  db.run("ALTER TABLE location ADD COLUMN type TEXT DEFAULT 'maps'");
} catch (e) {
  // Column likely already exists
}

// Add category column (migration)
try {
  db.run("ALTER TABLE location ADD COLUMN category TEXT DEFAULT 'attractions'");
  // Update existing records to have default category
  db.run("UPDATE location SET category = 'attractions' WHERE category IS NULL");
} catch (e) {
  // Column likely already exists
}

export type LocationCategory = 'dining' | 'accommodations' | 'attractions' | 'nightlife';

export interface LocationEntry {
  id?: number;
  name: string;
  address: string;
  url: string;
  embed_code?: string;
  instagram?: string;
  images?: string[];
  original_image_urls?: string[];
  lat?: number | null;
  lng?: number | null;
  parent_id?: number | null;
  type?: 'maps' | 'instagram' | 'upload';
  category?: LocationCategory;
}

export function saveLocation(location: LocationEntry): number | boolean {
  try {
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
      $type: location.type || 'maps',
      $category: location.category || 'attractions'
    });

    // Return the last inserted row ID
    const result = db.query("SELECT last_insert_rowid() as id").get() as { id: number };
    return result.id;
  } catch (error) {
    console.error("Error saving location to DB:", error);
    return false;
  }
}

export function updateLocationById(id: number, updates: Partial<LocationEntry>): boolean {
  try {
    // Only allow updating specific fields to prevent accidental data corruption
    const setClause = [];
    const params: any = { $id: id };

    if (updates.name !== undefined) {
      setClause.push('name = $name');
      params.$name = updates.name;
    }
    if (updates.address !== undefined) {
      setClause.push('address = $address');
      params.$address = updates.address;
    }
    if (updates.category !== undefined) {
      setClause.push('category = $category');
      params.$category = updates.category;
    }
    if (updates.url !== undefined) {
      setClause.push('url = $url');
      params.$url = updates.url;
    }
    if (updates.lat !== undefined) {
      setClause.push('lat = $lat');
      params.$lat = updates.lat;
    }
    if (updates.lng !== undefined) {
      setClause.push('lng = $lng');
      params.$lng = updates.lng;
    }

    if (setClause.length === 0) {
      return false; // Nothing to update
    }

    const query = db.query(`
      UPDATE location
      SET ${setClause.join(', ')}
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
  const query = db.query("SELECT id, name, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category FROM location ORDER BY created_at DESC");
  const rows = query.all() as any[];

  return rows.map(row => ({
    ...row,
    instagram: row.instagram || null,
    images: row.images ? JSON.parse(row.images) : [],
    original_image_urls: row.original_image_urls ? JSON.parse(row.original_image_urls) : [],
    parent_id: row.parent_id || null,
    type: row.type || 'maps',
    category: row.category || 'attractions'
  }));
}

export function getLocationById(id: number): LocationEntry | null {
  const query = db.query("SELECT id, name, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category FROM location WHERE id = $id");
  const row = query.get({ $id: id }) as any;

  if (!row) return null;

  return {
    ...row,
    instagram: row.instagram || null,
    images: row.images ? JSON.parse(row.images) : [],
    original_image_urls: row.original_image_urls ? JSON.parse(row.original_image_urls) : [],
    parent_id: row.parent_id || null,
    type: row.type || 'maps',
    category: row.category || 'attractions'
  };
}

export function getLocationsByParentId(parentId: number): LocationEntry[] {
  const query = db.query("SELECT id, name, address, url, embed_code, instagram, images, lat, lng, original_image_urls, parent_id, type, category FROM location WHERE parent_id = $parentId ORDER BY created_at DESC");
  const rows = query.all({ $parentId: parentId }) as any[];

  return rows.map(row => ({
    ...row,
    instagram: row.instagram || null,
    images: row.images ? JSON.parse(row.images) : [],
    original_image_urls: row.original_image_urls ? JSON.parse(row.original_image_urls) : [],
    parent_id: row.parent_id || null,
    type: row.type || 'instagram',
    category: row.category || 'attractions'
  }));
}

export function closeDb() {
  db.close();
}

export function clearDatabase() {
  try {
    db.run("DELETE FROM location");
    // Optionally vacuum to reclaim space
    db.run("VACUUM");
    return true;
  } catch (error) {
    console.error("Error clearing database:", error);
    return false;
  }
}
