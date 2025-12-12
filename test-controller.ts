import { getLocations } from "./src/features/locations/controllers/location.controller";

console.log("Testing controller...");

try {
  const response = getLocations();
  console.log("Response type:", typeof response);
  console.log("Response:", response);

} catch (error) {
  console.error("Error:", error);
}