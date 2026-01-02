import { getDb } from "../client";

/**
 * Migration: Remove redundant photographerCredit and altTexts columns from uploads table
 *
 * These fields are now stored only in imageSets, not at the upload container level.
 * This removes data redundancy where the same information was duplicated.
 */
export function removeUploadRedundantFields(): boolean {
  const db = getDb();

  try {
    console.log("🔄 Starting migration: Remove redundant fields from uploads table");

    db.run("BEGIN TRANSACTION");

    // Check if columns still exist
    const tableInfo = db.query("PRAGMA table_info(uploads)").all() as any[];
    const hasPhotographerCredit = tableInfo.some((col) => col.name === "photographerCredit");
    const hasAltTexts = tableInfo.some((col) => col.name === "altTexts");

    if (!hasPhotographerCredit && !hasAltTexts) {
      console.log("  ✓ Redundant columns already removed (migration already applied)");
      db.run("ROLLBACK");
      return true;
    }

    // Create new table without the redundant columns
    db.run(`
      CREATE TABLE uploads_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        images TEXT,
        imageMetadata TEXT,
        imageSets TEXT,
        uploadFormat TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE CASCADE
      )
    `);

    // Copy data from old table to new table, excluding the redundant columns
    db.run(`
      INSERT INTO uploads_new (id, location_id, images, imageMetadata, imageSets, uploadFormat, created_at)
      SELECT id, location_id, images, imageMetadata, imageSets, uploadFormat, created_at
      FROM uploads
    `);

    // Drop old table
    db.run("DROP TABLE uploads");

    // Rename new table to original name
    db.run("ALTER TABLE uploads_new RENAME TO uploads");

    // Recreate the index if it exists
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_uploads_location_id ON uploads(location_id)");
    } catch (error) {
      console.log("  ⚠️  Could not recreate index, continuing...");
    }

    db.run("COMMIT");
    console.log("  ✅ Migration completed successfully");
    console.log("     - Removed photographerCredit column from uploads table");
    console.log("     - Removed altTexts column from uploads table");

    return true;
  } catch (error) {
    db.run("ROLLBACK");
    console.error("  ❌ Migration failed:", error);
    return false;
  }
}
