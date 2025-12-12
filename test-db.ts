import { initDb, getDb } from "./src/shared/db/client";
import { getAllLocations } from "./src/features/locations/repositories/location.repository";

console.log("Testing database connection...");

try {
  initDb();
  console.log("Database initialized");

  const locations = getAllLocations();
  console.log(`Found ${locations.length} locations`);
  console.log("First location:", locations[0] || "None");

} catch (error) {
  console.error("Error:", error);
}