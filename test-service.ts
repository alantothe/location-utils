import { listLocations } from "./src/features/locations/services/location.service";

console.log("Testing service layer...");

try {
  const locations = listLocations();
  console.log(`Found ${locations.length} locations with children`);
  console.log("First location:", JSON.stringify(locations[0], null, 2));

} catch (error) {
  console.error("Error:", error);
}