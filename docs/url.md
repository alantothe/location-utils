# URL Utility API Documentation

Base URL: `http://localhost:3000`

## Endpoints

### Location Management
- `GET /api/locations` - List all locations
- `GET /api/locations-basic` - List locations with basic info only
- `POST /api/add-maps` - Create maps location
- `PATCH /api/maps/:id` - Update maps location
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

### Static Files
- `GET /src/data/images/*` - Serve images

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

## DELETE /api/locations/:slug

Delete a location by its URL slug.

**Path Parameters:**
- `slug` (string, required): URL-friendly identifier (kebab-case, e.g., "panchita-miraflores")

**Example:**
```bash
DELETE /api/locations/panchita-miraflores
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
- The slug is derived from the location name (lowercase, kebab-case format)

---

## POST /api/add-maps

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

## PATCH /api/maps/:id

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

**Response:**
```json
{
  "success": true,
  "message": "Database cleared successfully (locations, instagram_embeds, uploads)"
}
```

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
