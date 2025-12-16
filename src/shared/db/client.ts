import { Database } from "bun:sqlite";
import { splitLocationTables } from "./migrations/split-location-tables";
import { migrateInstagramEmbedsToUsername } from "./migrations/instagram-embeds-username";
import { migrateUploadsToPhotographerCredit } from "./migrations/uploads-photographer-credit";
import { removeLocationImagesField } from "./migrations/remove-location-images-field";
import { removeLocationDiningType } from "./migrations/remove-location-dining-type";
import { addCategoryConstraint } from "./migrations/add-category-constraint";

let db: Database | null = null;

function ensureDb(): Database {
  if (!db) {
    db = new Database("src/data/location.sqlite");
  }
  return db;
}

export function initDb() {
  const database = ensureDb();

  // Check if old schema exists (location table with type column)
  const oldSchemaExists = database.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='location'"
  ).get();

  if (oldSchemaExists) {
    console.log("🔄 Old schema detected. Running migration...");
    const migrationSuccess = splitLocationTables();

    if (!migrationSuccess) {
      throw new Error("Database migration failed! Check logs above.");
    }

    // Create location_taxonomy table if it doesn't exist
    database.run(`
      CREATE TABLE IF NOT EXISTS location_taxonomy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country TEXT NOT NULL,
        city TEXT,
        neighborhood TEXT,
        locationKey TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    return;
  }

  // New schema: Create three normalized tables

  database.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT,
      address TEXT NOT NULL,
      url TEXT NOT NULL,
      lat REAL,
      lng REAL,
      category TEXT DEFAULT 'attractions'
        CHECK(category IN ('dining', 'accommodations', 'attractions', 'nightlife')),
      locationKey TEXT,
      contactAddress TEXT,
      countryCode TEXT,
      phoneNumber TEXT,
      website TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, address)
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS instagram_embeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      url TEXT NOT NULL,
      embed_code TEXT NOT NULL,
      instagram TEXT,
      images TEXT,
      original_image_urls TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      location_id INTEGER NOT NULL,
      photographerCredit TEXT,
      images TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
    )
  `);

  // Create location hierarchy table for hierarchical location data
  database.run(`
    CREATE TABLE IF NOT EXISTS location_taxonomy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country TEXT NOT NULL,
      city TEXT,
      neighborhood TEXT,
      locationKey TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Run migration to update existing instagram_embeds tables
  migrateInstagramEmbedsToUsername();

  // Run migration to update existing uploads table
  migrateUploadsToPhotographerCredit();

  // Run migration to remove unused images field from locations table
  removeLocationImagesField(database);

  // Run migration to remove unused dining_type field from locations table
  removeLocationDiningType(database);

  // Run migration to add CHECK constraint to category field
  addCategoryConstraint(database);
}

export function getDb(): Database {
  return ensureDb();
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
