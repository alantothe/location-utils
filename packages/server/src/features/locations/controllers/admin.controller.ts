import type { Context} from "hono";
import { getDb } from "@server/shared/db/client";

export async function clearDatabase(c: Context) {
  const db = getDb();

  // Discover available tables so we can support both old and new schemas
  const tableRows = db
    .query("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as { name: string }[];
  const tables = new Set(tableRows.map((row) => row.name));

  // Clear all rows but keep table structure
  // New normalized tables
  if (tables.has("locations")) {
    db.run("DELETE FROM locations");
    db.run("DELETE FROM sqlite_sequence WHERE name='locations'");
  }
  if (tables.has("instagram_embeds")) {
    db.run("DELETE FROM instagram_embeds");
    db.run("DELETE FROM sqlite_sequence WHERE name='instagram_embeds'");
  }
  if (tables.has("uploads")) {
    db.run("DELETE FROM uploads");
    db.run("DELETE FROM sqlite_sequence WHERE name='uploads'");
  }

  // Legacy single table schema
  if (tables.has("location")) {
    db.run("DELETE FROM location");
    db.run("DELETE FROM sqlite_sequence WHERE name='location'");
  }

  // Clear location hierarchy/taxonomy
  if (tables.has("location_taxonomy")) {
    db.run("DELETE FROM location_taxonomy");
    db.run("DELETE FROM sqlite_sequence WHERE name='location_taxonomy'");
  }

  // Clear taxonomy corrections
  if (tables.has("taxonomy_corrections")) {
    db.run("DELETE FROM taxonomy_corrections");
    db.run("DELETE FROM sqlite_sequence WHERE name='taxonomy_corrections'");
  }

  // Clean up file size after mass deletes
  db.run("VACUUM");

  const clearedTables = Array.from(tables).filter((name) =>
    ["locations", "instagram_embeds", "uploads", "location", "location_taxonomy", "taxonomy_corrections"].includes(name)
  );

  return c.json({
    success: true,
    message: `Database cleared successfully${clearedTables.length ? ` (${clearedTables.join(", ")})` : ""}`,
  });
}
