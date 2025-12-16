# URL Utility API Documentation

This document outlines all available API endpoints for the URL Utility application, which manages location data including maps locations, Instagram embeds, and uploaded images.

## Base URL
```
http://localhost:3000
```

## API Endpoints Glossary

### Location Management
- `GET /api/locations` - List all locations
- `POST /api/add-maps` - Create maps location
- `POST /api/update-maps` - Update maps location
- `POST /api/add-instagram` - Add Instagram embed
- `POST /api/add-upload` - Upload files
- `POST /api/open-folder` - Open system folder
- `GET /api/clear-db` - Clear all location data

### Location Hierarchy
- `GET /api/location-hierarchy` (and legacy `/api/location-taxonomy`) - All hierarchy data
- `GET /api/location-hierarchy/countries` - List countries
- `GET /api/location-hierarchy/cities/:country` - Cities by country
- `GET /api/location-hierarchy/neighborhoods/:country/:city` - Neighborhoods by city/country

### Static Files
- `GET /src/data/images/*` - Serve uploaded images

## Location Management Endpoints

### GET /api/locations
Retrieves all locations with their associated Instagram embeds and uploads. The response now only returns the core fields for each location plus the nested child arrays.

**Response:**
```json
{
  "locations": [
    {
      "id": 1,
      "name": "Location Name",
      "title": "Display Title",
      "address": "123 Main St, City, Country",
      "url": "https://maps.google.com/...",
      "images": [],
      "lat": 40.7128,
      "lng": -74.0060,
      "category": "attractions",
      "dining_type": null,
      "created_at": "2024-01-15T10:30:00.000Z",
      "instagram_embeds": [
        {
          "id": 2,
          "location_id": 1,
          "username": "@username",
          "url": "https://www.instagram.com/p/ABC123/",
          "embed_code": "<blockquote class=\"instagram-media\">...</blockquote>",
          "images": [],
          "created_at": "2024-01-15T11:00:00.000Z"
        }
      ],
      "uploads": [
        {
          "id": 3,
          "location_id": 1,
          "photographerCredit": "Jane Doe Photography",
          "images": [],
          "created_at": "2024-01-15T11:30:00.000Z"
        }
      ]
    }
  ],
  "cwd": "/current/working/directory"
}
```
- `instagram_embeds` and `uploads` are always present as arrays (empty when no children)
- `cwd` reflects the server process working directory

### POST /api/add-maps
Creates a new maps location entry.

**Request Body (JSON):**
```json
{
  "name": "Location Name",
  "address": "123 Main St, City, State, Country"
}
```

- Required: `name`, `address`
- Optional: none (any extra fields are rejected)
- Behavior: When `GOOGLE_MAPS_API_KEY` is set, the server geocodes the address and may populate `lat`, `lng`, `countryCode`, `locationKey`, `contactAddress`, `website`, and `phoneNumber` from Google responses. The response echoes every field stored for the created location. Without the key, geocoded fields remain null.

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": 1,
    "name": "Location Name",
    "title": null,
    "address": "123 Main St, City, State",
    "url": "https://maps.google.com/...",
    "images": [],
    "lat": 40.7128,
    "lng": -74.0060,
    "category": "attractions",
    "dining_type": null,
    "contactAddress": "123 Main St, City, State",
    "countryCode": "+1",
    "phoneNumber": "555-1234",
    "website": "https://example.com",
    "locationKey": "colombia|bogota|chapinero"
  }
}
```

### POST /api/update-maps
Updates an existing maps location entry.

**Request Body (JSON):**
```json
{
  "id": 1,
  "title": "Updated Display Title",
  "name": "Updated Location Name",
  "address": "Updated Address",
  "category": "dining",
  "dining_type": "restaurant",
  "contactAddress": "Updated contact address",
  "countryCode": "+1",
  "phoneNumber": "555-1234",
  "website": "https://example.com",
  "locationKey": "colombia|bogota|chapinero"
}
```

- Required: `id`, `title`
- Optional: `name`, `address`, `category`, `dining_type`, `contactAddress`, `countryCode`, `phoneNumber`, `website`, `locationKey`
- Behavior: Supply both `name` and `address` together to regenerate the Google Maps URL. When the address changes and `GOOGLE_MAPS_API_KEY` is configured, the server will re-geocode and update coordinates. The `category` defaults to `attractions` if not provided or invalid. Other fields are updated directly when provided.

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": 1,
    "name": "Updated Location Name",
    "title": "Updated Display Title",
    "address": "Updated Address",
    "url": "https://maps.google.com/...",
    "images": [],
    "lat": 40.7128,
    "lng": -74.0060,
    "category": "dining",
    "dining_type": "restaurant",
    "contactAddress": "Updated contact address",
    "countryCode": "+1",
    "phoneNumber": "555-1234",
    "website": "https://example.com",
    "locationKey": "colombia|bogota|chapinero"
  }
}
```

### POST /api/add-instagram
Adds an Instagram embed to an existing location.

**Request Body (JSON):**
```json
{
  "embedCode": "<blockquote class=\"instagram-media\">...</blockquote>",
  "locationId": 1
}
```

- Required: `embedCode` (full Instagram embed HTML containing `data-instgrm-permalink`), `locationId` (an existing parent location)
- Optional: none
- Behavior: Creates an Instagram embed entry linked to the parent location via `location_id`. The server extracts the Instagram permalink and author information from the embed code. The `username` field is populated with the extracted username (e.g., `@username`) from the embed code's "A post shared by..." text. If username extraction fails, the request will be rejected with an error message. The server attempts to download media via RapidAPI and saves images to `src/data/images/{location}/instagram/{timestamp}/image_{n}.jpg`. The `images` array contains local file paths, and `original_image_urls` contains the original Instagram URLs. If media download fails, the embed entry is still created without images.

#### Important: JSON Escaping for Embed Codes

When submitting Instagram embed codes via API (curl, Postman, etc.), the HTML content contains double quotes that must be properly escaped in JSON.

**Common Mistake:**
```bash
# ❌ Wrong - Unescaped quotes break JSON parsing
{
  "embedCode": "<blockquote class="instagram-media">..."
}
```

**Correct Approaches:**

**Option 1: Escape quotes with backslashes**
```bash
curl -X POST http://localhost:3000/api/add-instagram \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": 1,
    "embedCode": "<blockquote class=\"instagram-media\" data-instgrm-permalink=\"https://www.instagram.com/p/ABC123/\">...</blockquote>"
  }'
```

**Option 2: Use a JSON file (Recommended)**
```bash
# Create embed.json with properly formatted content
{
  "locationId": 1,
  "embedCode": "<blockquote class=\"instagram-media\">...</blockquote>"
}

# Then submit it
curl -X POST http://localhost:3000/api/add-instagram \
  -H "Content-Type: application/json" \
  -d @embed.json
```

**Option 3: Use helper script (see scripts/add-instagram-embed.ts)**
```bash
bun run scripts/add-instagram-embed.ts --location-id 1 --embed-file embed.html
```

#### Troubleshooting

**Error: "JSON Parse error: Unrecognized token"**
- Cause: Unescaped quotes in embed code breaking JSON syntax
- Solution: Use one of the escaping methods above

**Error: "Could not extract username from embed code"**
- Cause: Embed code is missing the "A post shared by @username" section
- Solution: Ensure you copy the **complete** Instagram embed code (not a truncated preview)
- How to verify: Search for "A post shared by" in your embed code text

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": 2,
    "location_id": 1,
    "username": "@username",
    "url": "https://www.instagram.com/p/ABC123/",
    "embed_code": "<blockquote class=\"instagram-media\">...</blockquote>",
    "instagram": "https://www.instagram.com/username/",
    "images": ["src/data/images/location_name/instagram/1234567890/image_0.jpg"],
    "original_image_urls": ["https://instagram.com/..."],
    "created_at": "2024-01-15T11:00:00.000Z"
  }
}
```

### POST /api/add-upload
Uploads files to an existing location.

**Request Type:** `multipart/form-data`

**Form Fields:**
- Required: `locationId` (numeric ID of an existing location), `files` (one or more files)
- Optional: `photographerCredit` (text attribution for the photographer, can be empty)
- Note: The field `parentId` is also accepted for backward compatibility, but `locationId` is preferred
- Validation: Only JPEG, PNG, WebP, and GIF files are accepted; max 10MB per file; max 50MB per request; up to 20 files per upload. An empty file list is rejected.
- Behavior: Files are stored under `src/data/images/{location}/uploads/{timestamp}/image_{n}.{ext}` and the saved paths are echoed in the response.

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/add-upload \
  -F "locationId=1" \
  -F "photographerCredit=Jane Doe Photography" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg"
```

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": 3,
    "location_id": 1,
    "photographerCredit": "Jane Doe Photography",
    "images": ["src/data/images/location_name/uploads/1234567890/image_0.jpg"],
    "created_at": "2024-01-15T11:30:00.000Z"
  }
}
```

**Note:** If `photographerCredit` is not provided or is an empty string, the field will be `null` in the response.

### POST /api/open-folder
Opens a folder in the system's file explorer.

**Request Body:**
```json
{
  "folderPath": "/path/to/folder"
}
```

- Required: `folderPath` (path must resolve inside the server's working directory; absolute or escaping paths are rejected)

**Response:**
```json
{
  "success": true
}
```

### GET /api/clear-db
Clears all location data from the database (locations, instagram_embeds, and uploads tables). This endpoint also clears the legacy unified table if it exists, and runs VACUUM to reclaim disk space.

**Response:**
```json
{
  "success": true,
  "message": "Database cleared successfully (locations, instagram_embeds, uploads)"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Note:** This operation cannot be undone. Use with caution. File system images are NOT deleted - only database records are removed.

## Location Hierarchy Endpoints

### GET /api/location-hierarchy (legacy: /api/location-taxonomy)
Retrieves all location hierarchy entries (countries, cities, neighborhoods).

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

### GET /api/location-hierarchy/countries (legacy: /api/location-taxonomy/countries)
Retrieves all available countries.

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

### GET /api/location-hierarchy/cities/:country (legacy: /api/location-taxonomy/cities/:country)
Retrieves all cities for a specific country.

**Parameters:**
- Required path param `country`: Country code/slug (e.g., "colombia", "peru")

**Example:** `GET /api/location-hierarchy/cities/colombia`

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

### GET /api/location-hierarchy/neighborhoods/:country/:city (legacy: /api/location-taxonomy/neighborhoods/:country/:city)
Retrieves all neighborhoods for a specific city and country.

**Parameters:**
- Required path params: `country` (e.g., "colombia"), `city` (e.g., "bogota")

**Example:** `GET /api/location-hierarchy/neighborhoods/colombia/bogota`

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

## Static File Serving

### GET /src/data/images/*
Serves uploaded images and other static files from the data directory.

**Example:** `GET /src/data/images/uploads/123456789/image_0.jpg`

**Response:** Image file or 404 if not found

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing required fields)
- `404`: Not Found
- `500`: Internal Server Error

## Categories and Dining Types

### Location Categories
- `dining`
- `accommodations`
- `attractions`
- `nightlife`

### Dining Types
- `restaurant`, `fast-food`, `food-truck`, `cafe`, `bar`, `pub`
- `rooftop-bar`, `street-food`, `brewery`, `winery`, `seafood`
- `italian`, `american`, `wine-bar`, `cocktail-bar`, `dive-bar`
- `buffet`, `bakery`, `dessert`, `ice-cream`, `coffee-shop`
- `tea-shop`, `juice-bar`, `smoothie-bar`, `pizza`

## Environment Variables

- `GOOGLE_MAPS_API_KEY`: Required for geocoding functionality when adding/updating maps locations
- `PORT`: Server port (defaults to 3000)
