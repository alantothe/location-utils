# Database Schema Documentation

Database file: `packages/server/data/location.sqlite`

## Overview

The database uses a normalized schema with 6 tables:
- **locations** - Main location data (restaurants, attractions, accommodations, etc.)
- **instagram_embeds** - Instagram posts linked to locations
- **uploads** - Directly uploaded images
- **location_taxonomy** - Hierarchical location data with admin approval workflow
- **taxonomy_corrections** - Data correction rules for taxonomy values
- **payload_sync_state** - Sync tracking between url-util and Payload CMS

The schema evolved from a polymorphic design (single `location` table with `type` column) to the current normalized structure through automatic migrations.

---

## Table: `locations`

**Purpose:** Main location data for restaurants, attractions, accommodations, and nightlife venues.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `name` | TEXT | NOT NULL | Immutable location name (e.g., "Panchita - Miraflores") |
| `title` | TEXT | NULL | Display title (editable, separate from name) |
| `address` | TEXT | NOT NULL | Full address (immutable) |
| `url` | TEXT | NOT NULL | Google Maps URL (immutable) |
| `lat` | REAL | NULL | Latitude coordinate (immutable, from geocoding) |
| `lng` | REAL | NULL | Longitude coordinate (immutable, from geocoding) |
| `category` | TEXT | DEFAULT 'attractions', CHECK IN ('dining', 'accommodations', 'attractions', 'nightlife') | Location category |
| `locationKey` | TEXT | NULL | Pipe-delimited hierarchy key (e.g., "colombia\|bogota\|chapinero") |
| `district` | TEXT | NULL | Official city district (e.g., "Miraflores" in Lima) |
| `contactAddress` | TEXT | NULL | Contact-specific address (editable) |
| `countryCode` | TEXT | NULL | ISO country code (e.g., "PE", "CO") |
| `phoneNumber` | TEXT | NULL | Phone number with country code |
| `website` | TEXT | NULL | Website URL |
| `slug` | TEXT | UNIQUE | URL-friendly slug derived from name (lowercase, kebab-case) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### Constraints

- **UNIQUE(name, address)** - Prevents duplicate location combinations
- **UNIQUE(slug)** - Via index `idx_locations_slug`
- **CHECK(category IN ('dining', 'accommodations', 'attractions', 'nightlife'))**

### Immutable Fields

The following fields **cannot be updated** via PATCH endpoints:
- `id`, `name`, `address`, `url`, `lat`, `lng`, `created_at`

### Editable Fields

The following fields **can be updated** via PATCH endpoints:
- `title`, `category`, `locationKey`, `district`, `contactAddress`, `countryCode`, `phoneNumber`, `website`

### Key Notes

- **source object** in API responses preserves the original user input (`name`, `address`) as immutable reference data
- **contact object** groups contact-related fields (`countryCode`, `phoneNumber`, `website`, `contactAddress`, `url`)
- **coordinates object** contains geocoded latitude/longitude (can be null if not geocoded)
- Locations are only visible if `locationKey` is NULL or references an approved taxonomy entry

---

## Table: `instagram_embeds`

**Purpose:** Instagram posts linked to specific locations.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `location_id` | INTEGER | NOT NULL, FOREIGN KEY REFERENCES locations(id) ON DELETE CASCADE | Parent location |
| `username` | TEXT | NOT NULL | Instagram username (extracted from embed code) |
| `url` | TEXT | NOT NULL | Instagram post URL (permalink) |
| `embed_code` | TEXT | NOT NULL | Full blockquote embed code from Instagram |
| `instagram` | TEXT | NULL | Legacy field (deprecated, may be null) |
| `images` | TEXT | NULL | JSON array of downloaded image paths |
| `original_image_urls` | TEXT | NULL | JSON array of original Instagram image URLs |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### Constraints

- **FOREIGN KEY(location_id)** references `locations(id)` with **ON DELETE CASCADE**

### Data Format

- `images` and `original_image_urls` are stored as JSON strings
- Repository layer parses them to arrays using `JSON.parse()`
- Example: `["src/data/images/location_name/instagram/1234567890/image_0.jpg"]`

### File Storage

Images downloaded from Instagram are stored at:
```
packages/server/data/images/{location_name}/instagram/{timestamp}/image_{index}.jpg
```

---

## Table: `uploads`

**Purpose:** Directly uploaded images (not sourced from Instagram).

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `location_id` | INTEGER | NOT NULL, FOREIGN KEY REFERENCES locations(id) ON DELETE CASCADE | Parent location |
| `photographerCredit` | TEXT | NULL | Attribution/credit for the photographer |
| `images` | TEXT | NULL | JSON array of uploaded image paths |
| `imageMetadata` | TEXT | NULL | JSON array of image metadata (dimensions, size, format) |
| `altTexts` | TEXT | NULL | JSON array of AI-generated alt text for each image |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### Constraints

- **FOREIGN KEY(location_id)** references `locations(id)` with **ON DELETE CASCADE**

### Data Format

- `images` is stored as JSON string and parsed to array at repository level
- `imageMetadata` is stored as JSON string containing `ImageMetadata[]` array
- `altTexts` is stored as JSON string containing `string[]` array (parallel to images array)
- Example: `[{"width": 1920, "height": 1080, "size": 2458624, "format": "jpeg"}]`
- Example images: `["src/data/images/location_name/uploads/1234567890/image_0.jpg"]`
- Example altTexts: `["A beautiful restaurant interior with wooden tables", "Outdoor dining area with city views"]`

### File Storage

Directly uploaded images are stored at:
```
packages/server/data/images/{location_name}/uploads/{timestamp}/image_{index}.jpg
```

---

## Table: `location_taxonomy`

**Purpose:** Hierarchical location data (country → city → neighborhood) with admin approval workflow.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `country` | TEXT | NOT NULL | Country name (lowercase, e.g., "colombia") |
| `city` | TEXT | NULL | City name (lowercase, e.g., "bogota") |
| `neighborhood` | TEXT | NULL | Neighborhood/district (lowercase, e.g., "chapinero") |
| `locationKey` | TEXT | UNIQUE NOT NULL | Pipe-delimited key: "country\|city\|neighborhood" |
| `status` | TEXT | DEFAULT 'approved', CHECK IN ('approved', 'pending') | Approval status |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### Constraints

- **UNIQUE(locationKey)**
- **CHECK(status IN ('approved', 'pending'))**
- **Index:** `idx_taxonomy_status_key` ON (status, locationKey)

### Approval Workflow

1. **Pending entries** are created automatically when locations reference unknown taxonomy combinations
2. **Admin approval** is required via `PATCH /api/admin/taxonomy/:locationKey/approve`
3. **Rejection** deletes the entry via `DELETE /api/admin/taxonomy/:locationKey/reject`
4. Only **approved entries** appear in public location hierarchy endpoints

### Key Notes

- Dynamic system: taxonomy grows as new locations are added (no manual seeding required)
- Locations with pending taxonomy keys are filtered from public queries
- `locationKey` format: `country|city|neighborhood` (pipe-delimited, all lowercase)

---

## Table: `taxonomy_corrections`

**Purpose:** Data correction rules for automatically fixing misspelled taxonomy values.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `incorrect_value` | TEXT | NOT NULL | The misspelled/incorrect value |
| `correct_value` | TEXT | NOT NULL | The correct replacement value |
| `part_type` | TEXT | NOT NULL, CHECK IN ('country', 'city', 'neighborhood') | Which part of hierarchy this corrects |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |

### Constraints

- **UNIQUE(incorrect_value, part_type)**
- **CHECK(part_type IN ('country', 'city', 'neighborhood'))**
- **Index:** `idx_corrections_lookup` ON (incorrect_value, part_type)

### Usage

Applied during location creation/update via `LocationService`:
- Example: "bras-lia" is automatically corrected to "brasilia"
- Prevents duplicate entries due to spelling variations
- Lookup is case-insensitive for matching

---

## Table: `payload_sync_state`

**Purpose:** Tracks synchronization state between url-util locations and Payload CMS documents.

### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| `location_id` | INTEGER | NOT NULL, FOREIGN KEY REFERENCES locations(id) ON DELETE CASCADE | Parent location |
| `payload_collection` | TEXT | NOT NULL, CHECK IN ('dining', 'accommodations', 'attractions', 'nightlife') | Payload CMS collection type |
| `payload_doc_id` | TEXT | NOT NULL | Payload CMS document ID |
| `last_synced_at` | TEXT | NOT NULL | ISO timestamp of last sync attempt |
| `sync_status` | TEXT | NOT NULL DEFAULT 'success', CHECK IN ('success', 'failed', 'pending') | Sync operation status |
| `error_message` | TEXT | NULL | Error details if sync failed |

### Constraints

- **FOREIGN KEY(location_id)** references `locations(id)` with **ON DELETE CASCADE**
- **UNIQUE(location_id, payload_collection)** - One sync record per location per collection
- **Index:** `idx_payload_sync_location` ON (location_id)
- **Index:** `idx_payload_sync_status` ON (sync_status)
- **Index:** `idx_payload_sync_collection` ON (payload_collection)

### Usage

Tracks one-way synchronization from url-util to Payload CMS:
- Supports tracking sync status (success, failed, pending)
- Stores Payload document IDs for synced locations
- Enables retry logic for failed syncs
- Automatically cleans up when locations are deleted

---

## Relationships

```
locations (1) ──────── (many) instagram_embeds
    ↓
    └─ location_id (FK) ON DELETE CASCADE

locations (1) ──────── (many) uploads
    ↓
    └─ location_id (FK) ON DELETE CASCADE

locations (1) ──────── (many) payload_sync_state
    ↓
    └─ location_id (FK) ON DELETE CASCADE

locations (many) ────── (1) location_taxonomy
    ↓
    └─ locationKey (soft reference, filtered by status = 'approved')

location_taxonomy ────── taxonomy_corrections
    ↓
    └─ incorrect_value → correct_value lookup during save
```

### Key Relationship Notes

- **Cascading Deletes:** Deleting a location automatically deletes all related `instagram_embeds` and `uploads`
- **Soft Reference:** `locations.locationKey` references `location_taxonomy.locationKey` but is not a formal foreign key
- **Taxonomy Filtering:** Locations are only visible if their `locationKey` is NULL or references an approved taxonomy entry
- **Auto-Correction:** Before saving locations, the system checks `taxonomy_corrections` to replace misspelled values

---

## Migration History

The database auto-migrates on server start through these phases:

1. **split-location-tables.ts** - Converts old polymorphic `location` table to normalized schema (locations, instagram_embeds, uploads)
2. **instagram-embeds-username.ts** - Replaces name/address fields with username field in instagram_embeds
3. **uploads-photographer-credit.ts** - Replaces name/address/url fields with photographerCredit in uploads
4. **remove-location-images-field.ts** - Removes unused images column from locations table
5. **remove-location-dining-type.ts** - Removes deprecated dining_type column
6. **add-category-constraint.ts** - Adds CHECK constraint to category field
7. **add-location-slug.ts** - Adds slug column with unique index
8. **add-taxonomy-status.ts** - Adds status column to location_taxonomy for approval workflow
9. **add-location-district.ts** - Adds district column for official city districts
10. **add-taxonomy-corrections.ts** - Creates taxonomy_corrections table and fixes known issues (e.g., "bras-lia" → "brasilia")
11. **add-upload-metadata.ts** - Adds imageMetadata column to uploads table for storing image dimensions, size, and format
12. **add-payload-sync-tracking.ts** - Creates payload_sync_state table for tracking sync status with Payload CMS
13. **add-upload-alt-texts.ts** - Adds altTexts column to uploads table for storing AI-generated alt text for images

### Migration Logic

- Migrations run automatically on `initDb()` in `packages/server/src/shared/db/client.ts`
- Each migration is idempotent and checks for existing schema before applying changes
- Migration scripts located in `packages/server/src/shared/db/migrations/`

### Additional Migrations (Data/Utility)

These migrations are not part of the main schema evolution but handle data cleanup and fixes:

- **rename-columns.ts** - Historical migration to rename columns to camelCase (legacy)
- **fix-google-maps-urls.ts** - Updates Google Maps URLs to use comma separator format
- **cleanup-maps-parent-id.ts** - Removes invalid parent_id values from map-type locations (legacy)

---

## Data Integrity

### Cascading Deletes

Deleting a location cascades to delete all related records:
- All `instagram_embeds` with matching `location_id`
- All `uploads` with matching `location_id`
- All `payload_sync_state` records with matching `location_id`
- Physical image files remain on disk (manual cleanup required)

### Immutability Rules

Database constraints are enforced at the repository level:
- API validation prevents updates to: `id`, `name`, `address`, `url`, `lat`, `lng`, `created_at`
- These fields preserve the original user input as immutable source data

### JSON Storage

The following fields store JSON arrays as strings:
- `instagram_embeds.images`
- `instagram_embeds.original_image_urls`
- `uploads.images`
- `uploads.imageMetadata`

Repository `mapRow()` functions deserialize these to arrays using `JSON.parse()`.

### Taxonomy Filtering

Locations are filtered from public queries if:
- `locationKey` is NOT NULL
- AND the referenced taxonomy entry has `status = 'pending'`

This ensures only approved geographic areas appear in public APIs.

### Auto-Corrections

Before saving locations, the system:
1. Checks `taxonomy_corrections` table for each part (country, city, neighborhood)
2. Replaces incorrect values with correct ones
3. Prevents duplicate taxonomy entries due to spelling variations

---

## File Locations

### Database

- **Path:** `packages/server/data/location.sqlite`
- **Override:** Set `DB_PATH` environment variable to use custom location

### Image Storage

- **Base path:** `packages/server/data/images/`
- **Instagram:** `{location_name}/instagram/{timestamp}/image_{index}.jpg`
- **Uploads:** `{location_name}/uploads/{timestamp}/image_{index}.jpg`
- **Override:** Set `IMAGES_PATH` environment variable to use custom location

### Code Locations

- **Migrations:** `packages/server/src/shared/db/migrations/*.ts`
- **Repositories:** `packages/server/src/features/locations/repositories/*.ts`
- **Initialization:** `packages/server/src/shared/db/client.ts` (initDb function)

---

## API Response Format

All location endpoints return a nested structure that transforms the flat database schema:

```json
{
  "id": 1,
  "title": "Display Title",
  "category": "dining",
  "locationKey": "peru|lima|miraflores",
  "district": "Miraflores",
  "contact": {
    "countryCode": "PE",
    "phoneNumber": "+51 1 2425957",
    "website": "https://panchita.pe/",
    "contactAddress": "C. 2 de Mayo 298, Miraflores 15074, Peru",
    "url": "https://www.google.com/maps/search/?api=1&query=..."
  },
  "coordinates": {
    "lat": -12.1177544,
    "lng": -77.03121370000001
  },
  "source": {
    "name": "Panchita - Miraflores",
    "address": "C. 2 de Mayo 298, Miraflores 15074, Peru"
  },
  "instagram_embeds": [...],
  "uploads": [...],
  "created_at": "2025-12-16 21:34:40"
}
```

**Key points:**
- Database stores data flat; nesting happens at service layer via `transformLocationToResponse()`
- Repositories return flat rows; transformation applied in `LocationQueryService` and `MapsService`
- PATCH requests accept flat fields only (validation rejects nested objects)
