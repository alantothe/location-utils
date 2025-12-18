import { app } from "../../../shared/http/server";
import { validateBody, validateParams, validateQuery } from "../../../shared/core/middleware/validation.middleware";
import { createMapsSchema, patchMapsSchema } from "../validation/schemas/maps.schemas";
import { addInstagramSchema, addInstagramParamsSchema } from "../validation/schemas/instagram.schemas";
import { listLocationsQuerySchema } from "../validation/schemas/locations.schemas";

// Import new controllers
import { getLocations } from "../controllers/locations.controller";
import { postAddMaps, patchMapsById } from "../controllers/maps.controller";
import { postAddInstagram } from "../controllers/instagram.controller";
import { postAddUpload } from "../controllers/uploads.controller";
import { postOpenFolder, serveImage } from "../controllers/files.controller";
import {
  getLocationHierarchy,
  getCountries,
  getCitiesByCountry,
  getNeighborhoodsByCity,
} from "../controllers/hierarchy.controller";
import { clearDatabase } from "../controllers/admin.controller";

// Location routes
app.get("/api/locations", validateQuery(listLocationsQuerySchema), getLocations);
app.post("/api/add-maps", validateBody(createMapsSchema), postAddMaps);
app.patch("/api/maps/:id", validateBody(patchMapsSchema), patchMapsById);
app.post(
  "/api/add-instagram/:id",
  validateParams(addInstagramParamsSchema),
  validateBody(addInstagramSchema),
  postAddInstagram
);
app.post("/api/add-upload", postAddUpload); // Note: validation handled in controller due to multipart form
app.post("/api/open-folder", postOpenFolder);
app.get("/api/clear-db", clearDatabase);

// Location hierarchy API routes (legacy taxonomy paths kept for compatibility)
app.get("/api/location-hierarchy", getLocationHierarchy);
app.get("/api/location-hierarchy/countries", getCountries);
app.get("/api/location-hierarchy/cities/:country", getCitiesByCountry);
app.get("/api/location-hierarchy/neighborhoods/:country/:city", getNeighborhoodsByCity);
app.get("/api/location-taxonomy", getLocationHierarchy);
app.get("/api/location-taxonomy/countries", getCountries);
app.get("/api/location-taxonomy/cities/:country", getCitiesByCountry);
app.get("/api/location-taxonomy/neighborhoods/:country/:city", getNeighborhoodsByCity);

// Serve uploaded images
app.get("/src/data/images/*", serveImage);
