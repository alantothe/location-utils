import { getLocationRoutes } from "./src/features/locations/routes/location.routes";
import { pathMatcher } from "./src/shared/http/server";

console.log("Testing routes...");

try {
  const routes = getLocationRoutes();
  console.log(`Found ${routes.length} routes`);

  // Test the locations route
  const testUrl = new URL("http://localhost:3000/api/locations");
  const locationsRoute = routes.find(route =>
    route.method === "GET" && route.match(testUrl)
  );

  if (locationsRoute) {
    console.log("Found locations route, testing handler...");
    const response = locationsRoute.handler(new Request(testUrl), testUrl);
    console.log("Handler response type:", typeof response);
  } else {
    console.log("Locations route not found");
  }

} catch (error) {
  console.error("Error:", error);
}