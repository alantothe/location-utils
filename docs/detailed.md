# Codebase Function Reference & Cleanup Notes

Comprehensive walkthrough of the current backend (Bun + Hono) plus the supporting scripts/data. Focus is on how functions interact, how the UI is expected to use them, and opportunities to simplify or harden the code.

## Server Bootstrap & Shared Layers

- `src/server/main.ts`
  - `startServer(port?)`: initializes SQLite (`initDb`), imports routes to register handlers on the shared `app`, warns when `GOOGLE_MAPS_API_KEY` is missing, and calls `Bun.serve` with `app.fetch`. Frontend requests hit these routes once the server starts (default `PORT=3000`).
  - Interaction: depends on `src/shared/db/client.ts` and `src/shared/http/server.ts`; routes are attached via side-effect import of `src/features/locations/routes/location.routes`.
- `src/shared/http/server.ts`
  - `app`: singleton Hono instance shared by all controllers.
- `src/shared/db/client.ts`
  - `initDb()`: creates `location` and `location_taxonomy` tables; attempts to add columns with `addColumn` (used as ad‑hoc migrations). Runs a default category backfill.
  - `getDb()/closeDb()`: manage the lazy SQLite connection.
  - Optimization: `addColumn` attempts to re-add columns already present in the `CREATE TABLE` statement (`images`, `lat`, `lng`, `original_image_urls`, `instagram`), causing unnecessary exception swallowing on every boot. Consider dropping those duplicates and adding proper migrations. Contact info columns referenced elsewhere (`contactAddress`, `countryCode`, `phoneNumber`, `website`) are not in the schema.

## Locations Feature

### Routing
- `src/features/locations/routes/location.routes.ts`
  - Registers REST endpoints:
    - `GET /api/locations` → `getLocations`
    - `POST /api/add-maps` → `postAddMaps`
    - `POST /api/update-maps` → `postUpdateMaps`
    - `POST /api/add-instagram` → `postAddInstagram`
    - `POST /api/add-upload` → `postAddUpload`
    - `POST /api/open-folder` → `postOpenFolder`
    - Hierarchy routes: `/api/location-hierarchy*` and legacy `/api/location-taxonomy*`
    - Static file route: `GET /src/data/images/*` → `serveImage`
  - UI flow: the frontend (card-style dashboard described in `README.md`) should call these endpoints to list locations, add map entries, attach Instagram embeds, upload images, and fetch taxonomy data for dropdowns. Image URLs embedded in responses are expected to be reachable via the static route.

### Models & Config
- `src/features/locations/models/location.ts`
  - Defines types (`Location`, `InstagramEmbed`, `Upload`, `LocationWithNested`, taxonomy types). Contact fields and `locationKey` are included in the `Location` type.
- `src/features/locations/config/location-fields.config.ts`
  - Describes contact info form metadata (likely for a CMS/admin UI), mapping country codes from `src/shared/utils/country-codes.ts`.

### Controllers & Services
- `controllers/locations/index.ts`
  - `getLocations(c)`: returns all map locations with attached instagram/uploads (via `listLocations`) plus `cwd`. Called by UI to render cards and nested media.
- `controllers/locations/services/location-query.service.ts`
  - `listLocations()`: joins locations from normalized tables (`locations`, `instagram_embeds`, `uploads`) and attaches two child arrays: `instagram_embeds` and `uploads`.
  - Interaction: relies on `getAllLocations()` and separate queries for embeds and uploads; grouping is done in memory.
- `controllers/maps/index.ts`
  - `postAddMaps(c)`: validates `name`/`address`, rejects any extra fields, passes trimmed payload to `addMapsLocation`, returns JSON.
  - `postUpdateMaps(c)`: validates `id` and `title`, calls `updateMapsLocation`.
  - UI: used by map creation/edit forms; errors drive client-side validation.
- `controllers/maps/services/maps.service.ts`
  - `addMapsLocation(payload, apiKey?)`: validates required fields, builds a map entry via `createFromMaps` (geocodes/Places fetch if API key present), then `saveLocation`. Only name/address come from the client; the rest is derived.
  - `updateMapsLocation(payload, apiKey?)`: loads existing map record, recomputes Maps URL (and optional geocode) when both `name` and `address` provided, then calls `updateLocationById`; returns the re-fetched record.
  - Interaction: depends on `location.helper` for URL/geocode logic and repository for persistence.
  - Optimization:
    - `updateLocationById` ignores contact fields and `locationKey`, so updates silently drop `contactAddress/countryCode/phoneNumber/website/locationKey` passed in from the controller.
    - Schema lacks contact columns, so even `saveLocation` cannot persist them. Add columns + repository handling or remove fields from API.
    - `updateMapsLocation` requires both `name` and `address` to change URL; a new address alone keeps the old URL and name, which may be surprising.
- `controllers/instagram/index.ts`
  - `postAddInstagram(c)`: reads `{embedCode, locationId}`, delegates to `addInstagramEmbed`.
- `controllers/instagram/services/instagram.service.ts`
  - `addInstagramEmbed(payload)`: validates inputs and parent existence, extracts Instagram permalink (`extractInstagramData`), builds an Instagram child entry (`createFromInstagram`), saves it, then attempts to download images from RapidAPI (`instagram120`) and writes them to disk.
  - Interaction: uses repository for parent lookup/save and helper for embed parsing.
  - Optimization/Risks:
    - Hard-coded RapidAPI key and endpoint embed secrets in code; should move to env and handle restricted/failed network gracefully.
    - Saves files under `process.cwd()/images/...` but stores DB paths as `src/data/images/...`; the static route (`serveImage`) serves from `./src/data/images`, so downloaded files are not actually reachable.
    - Writes the same `entry` twice (before and after images) without updating the DB record ID; consider updating the saved record instead of re-inserting.
    - No guard against duplicate embeds for the same parent.
- `controllers/uploads/index.ts`
  - `postAddUpload(c)`: parses multipart form, resolves parent ID, filters non-empty files, and calls `addUploadFiles`.
- `controllers/uploads/services/uploads.service.ts`
  - `addUploadFiles(parentId, files)`: validates parent and file set, enforces type/size/count limits, creates an upload child entry via `createFromUpload`, saves it, writes files to disk, sets `entry.images`, and saves again.
  - Interaction: depends on repository for persistence and uses Bun’s file writing.
  - Optimization:
    - Same path mismatch as Instagram: files are written under `images/...` but paths and static route expect `src/data/images/...`.
    - Second `saveLocation(entry)` inserts a duplicate row instead of updating the just-created entry (lacks ID tracking).
    - No response includes uploaded paths beyond what was saved; broken paths will surface in UI.
- `controllers/files/index.ts`
  - `serveImage(c)`: serves a file relative to `.` for `/src/data/images/*` requests; returns 404 text when missing.
  - `postOpenFolder(c)`: accepts `{folderPath}`, calls `openFolder`.
- `controllers/files/services/filesystem.service.ts`
  - `openFolder(folderPath)`: joins `process.cwd()` with provided path, verifies it stays within cwd, spawns the OS `open` command.
  - Optimization: `open` is macOS-specific; consider cross-platform fallback or explicit error. No check that the folder exists before attempting to open.
- `controllers/location-hierarchy/index.ts`
  - CRUD-ish read endpoints for taxonomy; return full hierarchy, countries, cities by country, neighborhoods by city. Used by UI dropdowns or filters.
- `controllers/location-hierarchy/services/location-hierarchy.service.ts`
  - Thin pass-through to repository queries.

### Repositories
- `repositories/location.repository.ts`
  - `saveLocation(location)`: UPSERT by `(name, address)` into `location` table; serializes `images` and `original_image_urls`; returns last insert rowid or `false`.
  - `updateLocationById(id, updates)`: builds a dynamic `SET` clause for select fields (name/title/address/category/dining_type/url/lat/lng/locationKey), scoped to `type = 'maps'`.
  - `getAllLocations()/getLocationById()/getLocationsByParentId()`: read helpers mapping DB rows to `LocationEntry`.
  - `clearDatabase()`: deletes all rows and vacuums.
  - `getLocationsInScope(locationKey)`: filters in-memory on `isLocationInScope`.
  - Optimization:
    - Map row returns `locationKey` as `location_key` but uses property name `locationKey`; insert/update use `$location_key` → consistent, yet the schema init never adds `location_key` in the base `CREATE TABLE` (only via `addColumn`), risking absent column on fresh DB.
    - `saveLocation`/`updateLocationById` ignore contact fields; database schema also lacks them. API docs advertise these fields, leading to data loss.
    - UPSERT reassigns `created_at` to `CURRENT_TIMESTAMP` on conflict—might not be desired.
- `repositories/location-hierarchy.repository.ts`
  - Reads from `location_taxonomy`, mapping to `LocationHierarchy`.
  - Filter helpers (`getCountries`, `getCitiesByCountry`, `getNeighborhoodsByCity`, `getLocationsInScope`) rely on utility functions for scoping and deduplication.

### Utilities & Helpers
- `services/location.helper.ts`
  - `generateGoogleMapsUrl(name, address)`: builds a Google Maps search URL.
  - `geocode(address, apiKey?)`: hits Google Geocoding API to return `{lat,lng}`.
  - `getPlaceDetails(name, address, apiKey?)`: uses Places Text Search + Details to enrich with name/address/website/phone.
  - `createFromMaps(...)`: builds a `LocationEntry` for a map location; optionally geocodes and fetches place details. Returns the entry without saving.
  - `extractInstagramData(html)`: pulls `data-instgrm-permalink` and author text from embed HTML.
  - `normalizeInstagram(author)`: cleans an Instagram handle and builds a profile URL.
  - `createFromInstagram(embedHtml, parentLocationId?)`: constructs an Instagram `LocationEntry` child with generated name and cleaned URL/profile.
  - `createFromUpload(parentLocationId, timestamp?)`: constructs an upload `LocationEntry` child with a predictable name.
  - Optimization: `createFromInstagram` calls `extractInstagramData` twice; cache the first result. `createFromMaps` sets contact fields only when Places data is available; values sent from the API payload could override missing details.
- `utils/location-utils.ts`
  - Parsing/formatting helpers for `locationKey`, slug title-casing, filtering by country/city, extracting countries, scope checking (`isLocationInScope`), and generating combinations from structured country/city data.
  - Used by taxonomy repository and scripts; not wired into map creation (no automatic `locationKey` assignment).

### Scripts & Tests
- `scripts/seed-locations.ts`: seeds `location_taxonomy` from static data (`src/data/locations`), clearing the table first. Provides a CLI view of seeded entries.
- `scripts/test-location-utils.ts`: CLI smoke tests for location utilities.
- `test-routes.ts`: Exercises controllers with mocked Hono contexts; tests hierarchy endpoints and image serving with existing sample assets.

### Data & Static Assets
- `src/data/locations/**`: country/city/neighborhood definitions for Colombia and Peru; consumed by seed script and utilities.
- `src/data/images/**`: sample stored images used by `serveImage` tests; production uploads should land here but currently write to `./images`.
- `dist/`: generated output (not covered here).

## Frontend Expectations
- There is no frontend source in this repo; the `README.md` describes a card-based dashboard that calls the API endpoints documented in `docs/url.md`.
- Typical flow:
  1. UI loads `/api/locations` to render map entries and nested instagram/uploads.
  2. Forms hit `/api/add-maps` and `/api/update-maps` for CRUD; optional contact fields are supplied but currently dropped by the backend.
  3. Instagram form posts embed HTML to `/api/add-instagram`; gallery displays downloaded images at the paths stored in `entry.images`.
  4. Upload widget sends multipart to `/api/add-upload`; UI uses returned `entry.images` to show uploaded media.
  5. Taxonomy dropdowns query `/api/location-hierarchy/*`.
  6. Image thumbnails request `/src/data/images/...` directly.

## Cleanup & Optimization Opportunities
- **Persist contact fields**: Add `contact_address`, `country_code`, `phone_number`, `website` columns (or JSON) and include them in insert/update/select. Otherwise `/api/add-maps` and `/api/update-maps` silently discard user input.
- **Fix upload/Instagram file paths**: Align write location with the served path. Either write under `src/data/images/...` or change `serveImage`/stored paths to point to `./images/...`.
- **Avoid duplicate inserts for children**: Capture the inserted ID from `saveLocation` and update the same record after adding `images` instead of inserting again.
- **Remove redundant column migrations**: Drop `addColumn` calls for columns already in `CREATE TABLE` to reduce noisy exceptions and startup work.
- **Expose secrets via env**: Move RapidAPI key to an environment variable; provide error handling/logging when network calls fail or are unavailable.
- **Improve map update semantics**: Allow updating address or name independently, and regenerate URL/coords accordingly. Consider accepting unchanged fields gracefully without requiring `title`.
- **Schema consistency**: Ensure `location_key` exists on fresh databases (currently only added via `addColumn`) and hook `locationKey` into map creation/update when taxonomy is known.
- **Path safety & portability**: `openFolder` is macOS-specific and lacks existence checks; add validation and platform guards.
- **Error handling for static files**: `serveImage` uses the request path directly; consider sanitizing the path to avoid traversal issues.

These changes would make the backend align with the documented API and the expected UI experience, reducing broken image links and lost metadata.
