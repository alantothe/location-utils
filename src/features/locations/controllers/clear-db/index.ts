import { Context } from "hono";
import { getDb } from "../../../../shared/db/client";

export async function clearDatabase(c: Context) {
  try {
    const db = getDb();

    // Discover available tables so we can support both old and new schemas
    const tableRows = db
      .query("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tables = new Set(tableRows.map((row) => row.name));

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

    // Clean up file size after mass deletes
    db.run("VACUUM");

    const clearedTables = Array.from(tables).filter((name) =>
      ["locations", "instagram_embeds", "uploads", "location"].includes(name)
    );

    return c.json({
      success: true,
      message: `Database cleared successfully${clearedTables.length ? ` (${clearedTables.join(", ")})` : ""}`,
    });
  } catch (error) {
    console.error("Error clearing database:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
}
