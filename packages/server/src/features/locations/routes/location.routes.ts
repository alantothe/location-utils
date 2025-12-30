import { app } from "@server/shared/http/server";
import { validateBody, validateParams, validateQuery } from "@server/shared/core/middleware/validation.middleware";
import { createMapsSchema, patchMapsSchema } from "../validation/schemas/maps.schemas";
import { addInstagramSchema, addInstagramParamsSchema } from "../validation/schemas/instagram.schemas";
import { addUploadParamsSchema, deleteUploadParamsSchema } from "../validation/schemas/uploads.schemas";
import { listLocationsQuerySchema, deleteLocationSlugSchema, deleteLocationIdSchema } from "../validation/schemas/locations.schemas";
import { taxonomyLocationKeyParamsSchema } from "../validation/schemas/taxonomy.schemas";
import { createCorrectionSchema, deleteCorrectionParamsSchema } from "../validation/schemas/taxonomy-correction.schemas";
import { syncLocationIdSchema, syncAllSchema } from "../validation/schemas/payload.schemas";

// Import new controllers
import { getLocations, getLocationsBasic, getLocationById, deleteLocationBySlug, deleteLocationById } from "../controllers/locations.controller";
import { postAddMaps, patchMapsById } from "../controllers/maps.controller";
import { postAddInstagram } from "../controllers/instagram.controller";
import { postAddUpload, deleteUpload } from "../controllers/uploads.controller";
import { serveImage } from "../controllers/files.controller";
import {
  getLocationHierarchy,
  getCountries,
  getCountryNames,
  getCitiesByCountry,
  getNeighborhoodsByCity,
} from "../controllers/hierarchy.controller";
import { clearDatabase } from "../controllers/admin.controller";
import {
  getPendingTaxonomy,
  approveTaxonomy,
  rejectTaxonomy,
} from "../controllers/taxonomy-admin.controller";
import {
  getAllCorrections,
  previewCorrection,
  createCorrection,
  deleteCorrection,
} from "../controllers/taxonomy-correction.controller";
import {
  postSyncLocation,
  postSyncAll,
  getSyncStatus,
  getTestConnection,
} from "../controllers/payload.controller";

// Location routes
app.get("/api/locations", validateQuery(listLocationsQuerySchema), getLocations);
app.get("/api/locations-basic", validateQuery(listLocationsQuerySchema), getLocationsBasic);
app.get("/api/locations/:id", validateParams(deleteLocationIdSchema), getLocationById);
app.post("/api/locations", validateBody(createMapsSchema), postAddMaps);
app.patch("/api/locations/:id", validateBody(patchMapsSchema), patchMapsById);
app.delete("/api/locations/:id", validateParams(deleteLocationIdSchema), deleteLocationById);
app.post(
  "/api/add-instagram/:id",
  validateParams(addInstagramParamsSchema),
  validateBody(addInstagramSchema),
  postAddInstagram
);
app.post(
  "/api/add-upload/:id",
  validateParams(addUploadParamsSchema),
  postAddUpload
);
app.delete(
  "/api/uploads/:id",
  validateParams(deleteUploadParamsSchema),
  deleteUpload
);
app.get("/api/clear-db", clearDatabase);

// Location hierarchy API routes
app.get("/api/location-hierarchy", getLocationHierarchy);
app.get("/api/location-hierarchy/countries", getCountries);
app.get("/api/countries", getCountryNames);
app.get("/api/location-hierarchy/cities/:country", getCitiesByCountry);
app.get("/api/location-hierarchy/neighborhoods/:country/:city", getNeighborhoodsByCity);

// Admin taxonomy routes
app.get("/api/admin/taxonomy/pending", getPendingTaxonomy);
app.patch(
  "/api/admin/taxonomy/:locationKey/approve",
  validateParams(taxonomyLocationKeyParamsSchema),
  approveTaxonomy
);
app.delete(
  "/api/admin/taxonomy/:locationKey/reject",
  validateParams(taxonomyLocationKeyParamsSchema),
  rejectTaxonomy
);

// Admin taxonomy correction routes
app.get("/api/admin/taxonomy/corrections", getAllCorrections);
app.post(
  "/api/admin/taxonomy/corrections/preview",
  validateBody(createCorrectionSchema),
  previewCorrection
);
app.post(
  "/api/admin/taxonomy/corrections",
  validateBody(createCorrectionSchema),
  createCorrection
);
app.delete(
  "/api/admin/taxonomy/corrections/:id",
  validateParams(deleteCorrectionParamsSchema),
  deleteCorrection
);

// Payload sync routes
app.post(
  "/api/payload/sync/:id",
  validateParams(syncLocationIdSchema),
  postSyncLocation
);
app.post(
  "/api/payload/sync-all",
  validateBody(syncAllSchema),
  postSyncAll
);
app.get("/api/payload/sync-status", getSyncStatus);
app.get("/api/payload/sync-status/:id", getSyncStatus);
app.get("/api/payload/test-connection", getTestConnection);

// Serve uploaded images
app.get("/api/images/*", serveImage);
