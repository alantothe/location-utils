import { initDb } from "./shared/db/client";
import { startHttpServer } from "./shared/http/server";
import { getLocationRoutes } from "./features/locations/routes/location.routes";

export function startServer(port = Number(process.env.PORT || 3000)) {
  initDb();

  const routes = getLocationRoutes();

  return startHttpServer(routes, {
    port,
    onStart(server) {
      console.log(`\n🌐 Web Interface running at http://localhost:${server.port}`);
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        console.log("⚠️  GOOGLE_MAPS_API_KEY is not set. Geocoding will be skipped.");
      }
      console.log("Press Ctrl+C to stop the server and return to terminal.");
    },
  });
}

if (import.meta.main) {
  startServer();
}
