# URL Utility API Documentation

Base URL: `http://localhost:3000`

## Servers Overview

This application runs three servers in parallel:

- **Main API Server** (Bun + Hono): `http://localhost:3000` - Location management and file uploads
- **Frontend Client** (React + Vite): `http://localhost:5173` - Web interface
- **Python Alt Text Service** (FastAPI): `http://localhost:8000` - AI-powered alt text generation for images

## Endpoints

### Location Management
- `GET /api/locations` - List all locations
- `GET /api/locations-basic` - List locations with basic info only
- `GET /api/locations/:id` - Get single location by ID
- `POST /api/locations` - Create new location
- `PATCH /api/locations/:id` - Update location by ID
- `DELETE /api/locations/:id` - Delete location by ID
- `POST /api/add-instagram/:id` - Add Instagram embed
- `POST /api/add-upload/:id` - Upload files
- `POST /api/open-folder` - Open system folder
- `GET /api/clear-db` - Clear database

### Location Hierarchy
- `GET /api/location-hierarchy` - All hierarchy data
- `GET /api/location-hierarchy/countries` - List countries
- `GET /api/countries` - List country names only
- `GET /api/location-hierarchy/cities/:country` - Cities by country
- `GET /api/location-hierarchy/neighborhoods/:country/:city` - Neighborhoods

### Admin Taxonomy Management
- `GET /api/admin/taxonomy/pending` - Get pending taxonomy entries
- `PATCH /api/admin/taxonomy/:locationKey/approve` - Approve pending taxonomy entry
- `DELETE /api/admin/taxonomy/:locationKey/reject` - Reject pending taxonomy entry

### Static Files
- `GET /api/images/*` - Serve uploaded images

### Python Alt Text Service (Port 8000)

The Python service provides AI-powered alt text generation using BLIP image captioning and GPT-2 refinement models.

- `GET /test` - Health check endpoint
- `POST /alt` - Generate alt text from image upload
- `POST /caption` - Generate alt text with optional caption details

---

## GET /api/locations

**Query Parameters:**
- `category` (optional): `dining` | `accommodations` | `attractions` | `nightlife`
- `locationKey` (optional): `country` or `country|city` or `country|city|neighborhood`

**Examples:**
```bash
GET /api/locations
GET /api/locations?category=dining
GET /api/locations?locationKey=colombia|bogota
GET /api/locations?category=dining&locationKey=colombia|bogota
```

**Response:**
```json
{
  "locations": [
    {
      "id": 1,
      "title": "Display Title",
      "category": "dining",
      "locationKey": "peru|lima|miraflores",
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
      "instagram_embeds": [],
      "uploads": [],
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "cwd": "/current/working/directory"
}
```

---

## GET /api/locations-basic

List all locations with only basic information (name and location).

**Query Parameters:**
- `category` (optional): `dining` | `accommodations` | `attractions` | `nightlife`
- `locationKey` (optional): `country` or `country|city` or `country|city|neighborhood`

**Examples:**
```bash
GET /api/locations-basic
GET /api/locations-basic?category=dining
GET /api/locations-basic?locationKey=colombia|bogota
GET /api/locations-basic?category=dining&locationKey=colombia|bogota
```

**Response:**
```json
{
  "locations": [
    {
      "id": 1,
      "name": "Panchita - Miraflores",
      "location": "peru|lima|miraflores",
      "category": "dining"
    }
  ]
}
```

---

## GET /api/locations/:id

Get a single location by its ID.

**Path Parameters:**
- `id` (number, required): Location ID returned from POST /api/locations

**Example:**
```bash
GET /api/locations/1
```

**Response (Success - 200):**
```json
{
  "location": {
    "id": 1,
    "title": "Display Title",
    "category": "dining",
    "locationKey": "peru|lima|miraflores",
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
    "instagram_embeds": [],
    "uploads": [],
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Location not found"
}
```

---

## DELETE /api/locations/:id

Delete a location by its ID.

**Path Parameters:**
- `id` (number, required): Location ID returned from POST /api/locations

**Example:**
```bash
DELETE /api/locations/123
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "message": "Location deleted successfully"
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Location not found"
}
```

**Notes:**
- This operation cascades: all associated Instagram embeds and uploads are also deleted
- The ID is the primary key returned when creating locations via POST /api/locations

---

## POST /api/locations

**Request:**
```json
{
  "name": "Location Name",
  "address": "123 Main St, City, State, Country",
  "category": "dining"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": 1,
      "title": null,
      "category": "dining",
      "locationKey": "peru|lima|miraflores",
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
        "name": "Location Name",
        "address": "123 Main St, City, State"
      },
      "instagram_embeds": [],
      "uploads": [],
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## PATCH /api/locations/:id

**Updatable Fields:**
- `title`, `category`, `locationKey`, `contactAddress`, `countryCode`, `phoneNumber`, `website`

**Immutable Fields:**
- `id`, `name`, `address`, `url`, `lat`, `lng`, `created_at`

**Request:**
```json
{
  "title": "Updated Display Title",
  "category": "dining",
  "phoneNumber": "+51 1 2425957"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Updated display title",
    "category": "dining",
    "locationKey": "peru|lima|miraflores",
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
    "instagram_embeds": [],
    "uploads": [],
    "created_at": "2025-12-16 21:34:40"
  }
}
```

---

## POST /api/add-instagram/:id

**Request:**
```json
{
  "embedCode": "<blockquote class=\"instagram-media\" data-instgrm-permalink=\"https://www.instagram.com/p/ABC123/\">...</blockquote>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": 2,
      "location_id": 1,
      "username": "@username",
      "url": "https://www.instagram.com/p/ABC123/",
      "embed_code": "<blockquote class=\"instagram-media\">...</blockquote>",
      "instagram": null,
      "images": ["src/data/images/location_name/instagram/1234567890/image_0.jpg"],
      "original_image_urls": ["https://instagram.com/..."],
      "created_at": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

---

## POST /api/add-upload/:id

**Request Type:** `multipart/form-data`

**Form Fields:**
- `files` (required): One or more image files (JPEG, PNG, WebP, GIF)
- `photographerCredit` (optional): Text attribution

**Example:**
```bash
curl -X POST http://localhost:3000/api/add-upload/1 \
  -F "photographerCredit=Jane Doe Photography" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": 3,
      "location_id": 1,
      "photographerCredit": "Jane Doe Photography",
      "images": ["src/data/images/location_name/uploads/1234567890/image_0.jpg"],
      "created_at": "2024-01-15T11:30:00.000Z"
    }
  }
}
```

---

## POST /api/open-folder

**Request:**
```json
{
  "folderPath": "/path/to/folder"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## GET /api/clear-db

Clear all data from the database while preserving table structure.

**Example:**
```bash
GET /api/clear-db
```

**Response:**
```json
{
  "success": true,
  "message": "Database cleared successfully (locations, instagram_embeds, uploads, location_taxonomy, taxonomy_corrections)"
}
```

**Notes:**
- Deletes all rows from all tables but keeps table structure intact
- Resets auto-increment sequences to start from 1
- Runs `VACUUM` to reclaim disk space
- Safe to call while the server is running - no frontend errors
- Tables remain queryable (will return empty results)

---

## GET /api/location-hierarchy

**Response:**
```json
{
  "locations": [
    {
      "id": 1,
      "country": "colombia",
      "city": "bogota",
      "neighborhood": "chapinero",
      "locationKey": "colombia|bogota|chapinero"
    }
  ]
}
```

---

## GET /api/location-hierarchy/countries

**Response:**
```json
{
  "countries": [
    {
      "code": "CO",
      "label": "Colombia",
      "cities": [
        {
          "label": "Bogotá",
          "value": "bogota",
          "neighborhoods": [
            {
              "label": "Chapinero",
              "value": "chapinero"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## GET /api/countries

**Response:**
```json
["colombia", "peru"]
```

---

## GET /api/location-hierarchy/cities/:country

**Response:**
```json
{
  "cities": [
    {
      "label": "Bogotá",
      "value": "bogota",
      "neighborhoods": [
        {
          "label": "Chapinero",
          "value": "chapinero"
        }
      ]
    }
  ]
}
```

---

## GET /api/location-hierarchy/neighborhoods/:country/:city

**Response:**
```json
{
  "neighborhoods": [
    {
      "label": "Chapinero",
      "value": "chapinero"
    }
  ]
}
```

---

## GET /api/images/*

Serve uploaded images from the filesystem.

**Path Parameters:**
- `*` (string, required): Relative path to the image file within the images directory

**Examples:**
```bash
GET /api/images/location_name/uploads/1234567890/image_0.jpg
GET /api/images/location_name/instagram/1234567890/image_0.jpg
```

**Response:**
- Success (200): Returns the image file as binary data
- Not Found (404): Plain text "Image Not Found"

**Notes:**
- Images are stored in subdirectories by location name and type (uploads/instagram)
- The base images directory is configurable via `IMAGES_PATH` environment variable
- Falls back to `data/images` relative to the working directory if not set

---

## GET /api/admin/taxonomy/pending

Get all pending taxonomy entries that require approval before they can be used.

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": 1,
        "country": "brazil",
        "city": "rio-de-janeiro",
        "neighborhood": "copacabana",
        "locationKey": "brazil|rio-de-janeiro|copacabana",
        "status": "pending",
        "created_at": "2024-01-15T10:30:00.000Z",
        "locationCount": 3
      }
    ]
  }
}
```

**Notes:**
- `locationCount` indicates how many locations are currently using this taxonomy entry
- Pending entries are created automatically when new locations reference unknown taxonomy combinations

---

## PATCH /api/admin/taxonomy/:locationKey/approve

Approve a pending taxonomy entry, making it available for use by locations.

**Path Parameters:**
- `locationKey` (string, required): Taxonomy key in format `country|city|neighborhood`

**Example:**
```bash
PATCH /api/admin/taxonomy/brazil|rio-de-janeiro|copacabana
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": 1,
      "country": "brazil",
      "city": "rio-de-janeiro",
      "neighborhood": "copacabana",
      "locationKey": "brazil|rio-de-janeiro|copacabana",
      "status": "approved",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Taxonomy entry not found"
}
```

**Response (Bad Request - 400):**
```json
{
  "success": false,
  "error": "Taxonomy entry is already approved"
}
```

---

## DELETE /api/admin/taxonomy/:locationKey/reject

Reject and permanently delete a pending taxonomy entry.

**Path Parameters:**
- `locationKey` (string, required): Taxonomy key in format `country|city|neighborhood`

**Example:**
```bash
DELETE /api/admin/taxonomy/brazil|rio-de-janeiro|copacabana
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "message": "Taxonomy entry rejected"
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Taxonomy entry not found"
}
```

**Response (Bad Request - 400):**
```json
{
  "success": false,
  "error": "Cannot reject an approved taxonomy entry"
}
```

---

## Taxonomy Approval Workflow

The system implements a two-phase taxonomy management workflow to ensure data quality:

1. **Automatic Creation**: When a new location is created with a taxonomy combination (country|city|neighborhood) that doesn't exist in the approved taxonomy, a pending entry is automatically created.

2. **Admin Review**: Pending entries must be explicitly approved by an administrator before they can be used. This prevents typos and ensures consistent naming conventions.

3. **Admin Actions**:
   - **Approve**: Moves the entry from `pending` to `approved` status, making it available for use
   - **Reject**: Permanently deletes the pending entry

4. **Usage**: Only approved taxonomy entries appear in the location hierarchy endpoints and can be used when filtering locations.

This workflow ensures that the taxonomy remains clean and consistent while allowing for the discovery of new geographic areas.

---

## Python Alt Text Service Endpoints

### GET /test

Health check endpoint for the Python alt text service.

**Base URL:** `http://localhost:8000`

**Example:**
```bash
GET http://localhost:8000/test
```

**Response:**
```json
{
  "status": "ok",
  "message": "Server is working"
}
```

---

### POST /alt

Generate SEO-optimized alt text from an uploaded image using AI models.

**Base URL:** `http://localhost:8000`

**Request Type:** `multipart/form-data`

**Form Fields:**
- `image` (required): Image file (JPEG, PNG, WebP, etc.)

**Query Parameters:**
- `raw` (optional, boolean): Return raw alt text without processing
- `debug` (optional, boolean): Include debug information
- `include_caption` (optional, boolean): Include the raw BLIP caption alongside the refined alt text

**Examples:**
```bash
# Basic alt text generation
curl -X POST http://localhost:8000/alt \
  -F "image=@/path/to/image.jpg"

# Include raw caption for comparison
curl -X POST "http://localhost:8000/alt?include_caption=true" \
  -F "image=@/path/to/image.jpg"
```

**Response (Success - 200):**
```json
{
  "alt": "Beautiful coastal restaurant with ocean views and wooden dining tables"
}
```

**Response (with include_caption=true):**
```json
{
  "alt": "Beautiful coastal restaurant with ocean views and wooden dining tables",
  "caption": "a restaurant with tables and chairs overlooking the ocean"
}
```

**Response (Error - 400):**
```json
{
  "detail": "file must be an image"
}
```

**Notes:**
- Uses BLIP (Salesforce/blip-image-captioning-base) for initial image captioning
- Refines captions to SEO-optimized alt text (8-12 words) using DistilGPT-2
- Optimized for Apple Silicon with MPS (Metal Performance Shaders) GPU acceleration
- Models are loaded on startup for better performance
- Falls back gracefully if GPU acceleration is unavailable

---

### POST /caption

Legacy endpoint for alt text generation (similar to `/alt` but with different response format).

**Base URL:** `http://localhost:8000`

**Request Type:** `multipart/form-data`

**Form Fields:**
- `image` (required): Image file

**Query Parameters:**
- `include_caption` (optional, boolean): Include raw caption alongside alt text

**Response:**
```json
{
  "alt": "Beautiful coastal restaurant with ocean views and wooden dining tables",
  "words": 8,
  "caption": "a restaurant with tables and chairs overlooking the ocean"
}
```

---
