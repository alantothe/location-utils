# External App Integration Guide

**Complete guide for building an external admin utility to add data (accommodations, attractions, dining, nightlife) with images to the Questura backend.**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [How It Works](#how-it-works)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [API Reference](#api-reference)
5. [Testing & Troubleshooting](#testing--troubleshooting)

---

## Quick Start

### What You're Building

An admin utility app (runs on your PC) that:
1. Fills out a form (title, location, type, images, contact info, etc.)
2. On submit: uploads images to Payload → gets MediaAsset IDs
3. Creates data entry (dining/accommodation/etc.) with those IDs

### The 3 API Calls You Need

```javascript
// 1. Login (once) → get JWT token
POST /api/users/login
Body: { email, password }
Response: { token }

// 2. Upload each image → get MediaAsset ID
POST /api/media-assets
Body: FormData with file
Response: { doc: { id: "abc123" } }

// 3. Create entry with MediaAsset IDs
POST /api/dining           // or /api/accommodations, /api/attractions, /api/nightlife
Body: { title, location, gallery: [{ image: "abc123" }], type: "...", ... }
Response: { doc: { id: "xyz789" } }
```

### Available Collections

| Collection | Endpoint | Example Types |
|------------|----------|---------------|
| **Dining** | `/api/dining` | `restaurant`, `cafe`, `bar`, `seafood`, `bakery` |
| **Accommodations** | `/api/accommodations` | `hotel`, `hostel`, `resort`, `villa` |
| **Attractions** | `/api/attractions` | `museum`, `beach`, `historical-site` |
| **Nightlife** | `/api/nightlife` | `nightclub`, `rooftop-bar`, `lounge` |

**All collections have the same fields.** Only the `type` options are different.

### Critical Points

✅ **Images FIRST, data entry SECOND** - This is mandatory
✅ **Response = Confirmation** - When `/api/media-assets` responds, Bunny upload is complete
✅ **No Bunny.net connection needed** - Plugin handles CDN upload automatically
✅ **Store IDs immediately** - Each MediaAsset ID is ready to use right away

---

## How It Works

### Architecture Overview

```
External App (your admin utility)
  │
  ├─ No user system (uses service account)
  ├─ Runs on admin's PC
  └─ Talks to Payload via REST API
      │
      └─ Payload CMS (http://localhost:4000)
          │
          ├─ Authenticates requests (JWT tokens)
          ├─ Receives images → @seshuk/payload-storage-bunny plugin
          │   └─ Automatically uploads to Bunny.net CDN
          │   └─ Returns MediaAsset with ID
          │
          └─ Receives data entries with MediaAsset IDs
```

### The Required Sequence

**CRITICAL:** This must happen in order!

```
┌──────────────────────────────────────┐
│ 1. User fills form in external app  │
│    - Title, type, location, etc.    │
│    - Selects 3 images from disk     │
└──────────────┬───────────────────────┘
               │ User clicks "Submit"
               ▼
┌──────────────────────────────────────┐
│ 2. Upload Image 1                    │
│    POST /api/media-assets            │
│    (waits for Bunny upload...)       │
│    Returns: { id: "abc123" } ✓       │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ 3. Upload Image 2                    │
│    POST /api/media-assets            │
│    Returns: { id: "def456" } ✓       │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ 4. Upload Image 3                    │
│    POST /api/media-assets            │
│    Returns: { id: "ghi789" } ✓       │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ 5. Build document with IDs           │
│    {                                 │
│      title: "La Mar",                │
│      gallery: [                      │
│        { image: "abc123" },          │
│        { image: "def456" },          │
│        { image: "ghi789" }           │
│      ]                               │
│    }                                 │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ 6. Submit to collection              │
│    POST /api/dining                  │
│    Returns: { doc: { id: "xyz" } } ✓ │
└──────────────────────────────────────┘
```

### Why This Sequence?

**Each `/api/media-assets` request is synchronous:**

```
Your app sends image
    ↓
Payload receives file
    ↓
@seshuk/payload-storage-bunny plugin runs
    ↓
Plugin uploads to Bunny.net (waits for completion) ☁️
    ↓
Payload saves MediaAsset to database
    ↓
Response sent: { doc: { id: "abc123" } }
    ↓
Your app receives response
```

**When you get the response, Bunny upload is DONE.** No separate confirmation needed.

---

## Step-by-Step Implementation

### Prerequisites

1. **Backend running** at `http://localhost:4000`
2. **Service account created** with `editor` or `admin` role
3. **Know valid location identifiers** (e.g., "lima-peru")

### Step 1: Create Service Account

The external app doesn't have users - it authenticates as one service account.

**Option A: Via Payload Admin Panel**

1. Go to `http://localhost:4000/admin`
2. Navigate to Users collection
3. Create new user:
   - **Email**: `service-account@questurian.com`
   - **Password**: Strong password (save it securely!)
   - **Role**: `admin` or `editor`
4. Save

**Option B: Via API** (if you have an existing admin token)

```javascript
await fetch('http://localhost:4000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `JWT ${existingAdminToken}`,
  },
  body: JSON.stringify({
    email: 'service-account@questurian.com',
    password: 'your-strong-password',
    role: 'editor',
  }),
});
```

### Step 2: Set Up Configuration

**Store credentials securely (use .env file):**

```javascript
// .env (add to .gitignore!)
SERVICE_EMAIL=service-account@questurian.com
SERVICE_PASSWORD=your-strong-password
BACKEND_URL=http://localhost:4000

// In your code
require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL;
const SERVICE_EMAIL = process.env.SERVICE_EMAIL;
const SERVICE_PASSWORD = process.env.SERVICE_PASSWORD;

let authToken = null;
```

### Step 3: Implement Authentication

```javascript
/**
 * Login and get JWT token
 */
async function authenticate() {
  const response = await fetch(`${BACKEND_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: SERVICE_EMAIL,
      password: SERVICE_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const data = await response.json();
  authToken = data.token;
  console.log('✓ Logged in. Token expires:', new Date(data.exp * 1000));
  return authToken;
}

/**
 * Helper: Auto-retry with re-auth on 401
 */
async function authenticatedFetch(url, options = {}) {
  // Ensure we have a token
  if (!authToken) {
    await authenticate();
  }

  // Add auth header
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `JWT ${authToken}`,
    },
  };

  let response = await fetch(url, authOptions);

  // If 401, token expired - re-authenticate and retry
  if (response.status === 401) {
    console.log('Token expired, re-authenticating...');
    await authenticate();
    authOptions.headers['Authorization'] = `JWT ${authToken}`;
    response = await fetch(url, authOptions);
  }

  return response;
}
```

### Step 4: Implement Image Upload

```javascript
/**
 * Upload a single image
 * Returns: MediaAsset ID (string)
 */
async function uploadImage(file, altText, location = null) {
  const formData = new FormData();
  formData.append('file', file); // File object or Buffer
  formData.append('alt_text', altText);

  if (location) {
    formData.append('location', location);
  }

  const response = await authenticatedFetch(`${BACKEND_URL}/api/media-assets`, {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type - browser/fetch sets it automatically with boundary
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Image upload failed: ${error.errors[0].message}`);
  }

  const data = await response.json();
  console.log('✓ Uploaded:', data.doc.filename, '→ ID:', data.doc.id);

  // THIS IS THE ID YOU NEED!
  return data.doc.id;
}
```

### Step 5: Implement Data Entry Creation

```javascript
/**
 * Create a dining entry
 * Returns: Created entry document
 */
async function createDining(diningData) {
  const response = await authenticatedFetch(`${BACKEND_URL}/api/dining`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(diningData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create entry: ${error.errors[0].message}`);
  }

  const data = await response.json();
  console.log('✓ Created dining entry:', data.doc.id);
  return data.doc;
}

/**
 * Create an accommodation entry
 */
async function createAccommodation(accommodationData) {
  const response = await authenticatedFetch(`${BACKEND_URL}/api/accommodations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accommodationData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create entry: ${error.errors[0].message}`);
  }

  const data = await response.json();
  console.log('✓ Created accommodation entry:', data.doc.id);
  return data.doc;
}

/**
 * Create an attraction entry
 */
async function createAttraction(attractionData) {
  const response = await authenticatedFetch(`${BACKEND_URL}/api/attractions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attractionData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create entry: ${error.errors[0].message}`);
  }

  const data = await response.json();
  console.log('✓ Created attraction entry:', data.doc.id);
  return data.doc;
}

/**
 * Create a nightlife entry
 */
async function createNightlife(nightlifeData) {
  const response = await authenticatedFetch(`${BACKEND_URL}/api/nightlife`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nightlifeData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create entry: ${error.errors[0].message}`);
  }

  const data = await response.json();
  console.log('✓ Created nightlife entry:', data.doc.id);
  return data.doc;
}

/**
 * Generic function - works for any collection
 */
async function createEntry(collection, data) {
  const response = await authenticatedFetch(`${BACKEND_URL}/api/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create ${collection} entry: ${error.errors[0].message}`);
  }

  const result = await response.json();
  console.log(`✓ Created ${collection} entry:`, result.doc.id);
  return result.doc;
}

// Usage examples:
// await createEntry('dining', diningData);
// await createEntry('accommodations', accommodationData);
// await createEntry('attractions', attractionData);
// await createEntry('nightlife', nightlifeData);
```

### Step 6: Put It All Together

```javascript
/**
 * Complete workflow: Upload images and create dining entry
 */
async function submitDiningEntry(formData, imageFiles) {
  const uploadedImageIds = [];

  try {
    // STEP 1: Authenticate
    if (!authToken) {
      await authenticate();
    }

    // STEP 2: Upload all images FIRST
    console.log(`Uploading ${imageFiles.length} images...`);

    for (let i = 0; i < imageFiles.length; i++) {
      console.log(`Uploading image ${i + 1}/${imageFiles.length}...`);

      const mediaAssetId = await uploadImage(
        imageFiles[i],
        formData.imageAlts[i] || `Image ${i + 1}`,
        formData.location
      );

      uploadedImageIds.push(mediaAssetId);
      console.log(`✓ Image ${i + 1} uploaded: ${mediaAssetId}`);
    }

    // STEP 3: Build gallery array with uploaded IDs
    const gallery = uploadedImageIds.map((id, index) => ({
      image: id, // MediaAsset ID from upload
      altText: formData.imageAlts[index] || '',
      caption: formData.imageCaptions[index] || '',
    }));

    // STEP 4: Build complete document
    const diningData = {
      title: formData.title,
      type: formData.type,
      location: formData.location,
      gallery: gallery, // ← Contains MediaAsset IDs
      address: formData.address,
      countryCode: formData.countryCode,
      phoneNumber: formData.phoneNumber,
      website: formData.website,
      latitude: formData.latitude,
      longitude: formData.longitude,
      status: formData.status || 'published',
    };

    // STEP 5: Submit to dining collection
    console.log('Creating dining entry...');
    const result = await createDining(diningData);

    console.log('✓ SUCCESS! Entry ID:', result.id);
    return result;

  } catch (error) {
    console.error('✗ Failed to submit entry:', error.message);

    // If we failed partway through image uploads,
    // uploadedImageIds contains the successfully uploaded images
    // You could delete them or leave them for retry

    throw error;
  }
}

// USAGE EXAMPLE
const result = await submitDiningEntry(
  {
    title: "La Mar Cebichería",
    type: "seafood",
    location: "lima-peru",
    imageAlts: [
      "Restaurant exterior with ocean view",
      "Fresh ceviche plate",
      "Interior dining area"
    ],
    imageCaptions: [
      "Main entrance facing the beach",
      "Signature ceviche dish",
      "Modern dining room with sea views"
    ],
    address: "https://maps.google.com/?q=La+Mar+Cebicheria+Lima",
    countryCode: "+51",
    phoneNumber: "987654321",
    website: "https://lamarcebicheria.com",
    latitude: -12.1234567,
    longitude: -77.0234567,
    status: "published",
  },
  [imageFile1, imageFile2, imageFile3]
);

console.log('Entry created with ID:', result.id);
```

### Examples for All Collections

**Dining Example:**
```javascript
await createDining({
  title: "La Mar Cebichería",
  type: "seafood",
  location: "lima-peru",
  gallery: [{ image: id1, altText: "Restaurant exterior" }],
  address: "https://maps.google.com/?q=...",
  countryCode: "+51",
  phoneNumber: "987654321",
  website: "https://lamarcebicheria.com",
  latitude: -12.1234567,
  longitude: -77.0234567,
  status: "published",
});
```

**Accommodation Example:**
```javascript
await createAccommodation({
  title: "Sunset Beach Hotel",
  type: "hotel",
  location: "lima-peru",
  gallery: [{ image: id1, altText: "Hotel exterior" }],
  address: "https://maps.google.com/?q=...",
  countryCode: "+51",
  phoneNumber: "987654321",
  website: "https://sunsetbeach.com",
  latitude: -12.1234567,
  longitude: -77.0234567,
  status: "published",
});
```

**Attraction Example:**
```javascript
await createAttraction({
  title: "Machu Picchu",
  type: "historical-site",
  location: "cusco-peru",
  gallery: [{ image: id1, altText: "Ancient ruins" }],
  address: "https://maps.google.com/?q=...",
  status: "published",
});
```

**Nightlife Example:**
```javascript
await createNightlife({
  title: "Sky Lounge",
  type: "rooftop-bar",
  location: "lima-peru",
  gallery: [{ image: id1, altText: "Rooftop bar view" }],
  address: "https://maps.google.com/?q=...",
  countryCode: "+51",
  phoneNumber: "987654321",
  website: "https://skylounge.com",
  status: "published",
});
```

**Generic Helper (works for any collection):**
```javascript
// Same data structure for all collections, just change the collection name
const hotelData = {
  title: "My Hotel",
  type: "hotel",
  location: "lima-peru",
  gallery: [{ image: imageId, altText: "Photo" }],
  status: "published",
};

await createEntry('accommodations', hotelData); // ✓ Works!
await createEntry('dining', restaurantData);     // ✓ Works!
await createEntry('attractions', attractionData); // ✓ Works!
await createEntry('nightlife', nightlifeData);    // ✓ Works!
```

---

## API Reference

Complete request/response formats for all endpoints.

### 1. Authentication

#### POST `/api/users/login`

**Request:**
```http
POST http://localhost:4000/api/users/login
Content-Type: application/json

{
  "email": "service-account@questurian.com",
  "password": "your-password"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Auth Passed",
  "user": {
    "id": "6501234567890abcdef12345",
    "email": "service-account@questurian.com",
    "role": "admin",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "exp": 1705929000
}
```

**What to Store:**
- `token` - Use in all requests as `Authorization: JWT <token>`
- Token expires in 7 days

**Error Response (401 Unauthorized):**
```json
{
  "errors": [
    { "message": "Invalid login credentials" }
  ]
}
```

---

### 2. Image Upload

#### POST `/api/media-assets`

**Request (multipart/form-data):**

```javascript
const formData = new FormData();
formData.append('file', imageFile); // Required
formData.append('alt_text', 'Deluxe hotel room with ocean view'); // Optional
formData.append('location', 'lima-peru'); // Optional
formData.append('photographer_credit', 'John Smith'); // Optional

const response = await fetch('http://localhost:4000/api/media-assets', {
  method: 'POST',
  headers: {
    'Authorization': `JWT ${token}`,
    // Do NOT set Content-Type - browser sets it with boundary
  },
  body: formData,
});
```

**Success Response (201 Created):**
```json
{
  "message": "Media asset created successfully",
  "doc": {
    "id": "65abc123def4567890123456",
    "alt_text": "Deluxe hotel room with ocean view",
    "photographer_credit": null,
    "location": "lima-peru",
    "location_finalized": false,
    "tags": [],
    "user": null,
    "uploadedBy": "6501234567890abcdef12345",
    "filename": "hotel-room-1705929123456.jpg",
    "mimeType": "image/jpeg",
    "filesize": 245678,
    "width": 1920,
    "height": 1080,
    "focalX": 50,
    "focalY": 50,
    "sizes": {
      "thumbnail": {
        "width": 400,
        "height": 300,
        "mimeType": "image/jpeg",
        "filesize": 12345,
        "filename": "hotel-room-1705929123456-400x300.jpg",
        "url": "https://questurian-cdn.b-cdn.net/media/hotel-room-1705929123456-400x300.jpg"
      }
    },
    "url": "https://questurian-cdn.b-cdn.net/media/hotel-room-1705929123456.jpg",
    "createdAt": "2024-01-22T14:25:23.456Z",
    "updatedAt": "2024-01-22T14:25:23.456Z"
  }
}
```

**What to Store:**
- `doc.id` - MediaAsset ID to reference in gallery (e.g., `"65abc123def4567890123456"`)
- `doc.url` - Bunny CDN URL (optional, for verification)

**Field Reference:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | Binary | ✅ Yes | Image file data |
| `alt_text` | String | ❌ No | Accessibility description |
| `location` | String | ❌ No | Location identifier (e.g., "lima-peru") |
| `photographer_credit` | String | ❌ No | Photographer attribution |

**Auto-Generated Fields (in response only):**
- `id`, `filename`, `mimeType`, `filesize`, `width`, `height`
- `url` (Bunny CDN URL - set by plugin)
- `sizes` (auto-generated thumbnails)
- `uploadedBy` (current user's ID)
- `createdAt`, `updatedAt`

**Error Responses:**

```json
// 413 Payload Too Large
{
  "errors": [
    { "message": "File size exceeds maximum allowed size of 5MB" }
  ]
}

// 415 Unsupported Media Type
{
  "errors": [
    { "message": "File type not allowed. Allowed types: image/jpeg, image/png, image/webp" }
  ]
}
```

**Constraints:**
- Max file size: **5 MB**
- Allowed types: **image/jpeg, image/png, image/webp**

---

### 3. Create Dining Entry

#### POST `/api/dining`

**Request:**
```http
POST http://localhost:4000/api/dining
Authorization: JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "La Mar Cebichería",
  "type": "seafood",
  "location": "lima-peru",
  "gallery": [
    {
      "image": "65abc123def4567890123456",
      "altText": "Restaurant exterior with ocean view",
      "caption": "Main entrance facing the beach"
    },
    {
      "image": "65def456abc7890123456789",
      "altText": "Fresh ceviche plate",
      "caption": "Signature ceviche dish"
    }
  ],
  "address": "https://maps.google.com/?q=La+Mar+Cebicheria+Lima",
  "countryCode": "+51",
  "phoneNumber": "987654321",
  "website": "https://lamarcebicheria.com",
  "latitude": -12.1234567,
  "longitude": -77.0234567,
  "status": "published"
}
```

**Success Response (201 Created):**
```json
{
  "message": "Dining created successfully",
  "doc": {
    "id": "65xyz789abc0123456789def",
    "title": "La Mar Cebichería",
    "type": "seafood",
    "location": "lima-peru",
    "gallery": [
      {
        "image": {
          "id": "65abc123def4567890123456",
          "alt_text": "Restaurant exterior with ocean view",
          "filename": "restaurant-exterior-1705929123456.jpg",
          "mimeType": "image/jpeg",
          "filesize": 245678,
          "width": 1920,
          "height": 1080,
          "url": "https://questurian-cdn.b-cdn.net/media/restaurant-exterior-1705929123456.jpg",
          "createdAt": "2024-01-22T14:25:23.456Z",
          "updatedAt": "2024-01-22T14:25:23.456Z"
        },
        "altText": "Restaurant exterior with ocean view",
        "caption": "Main entrance facing the beach",
        "id": "65item1234567890abcdef01"
      }
    ],
    "address": "https://maps.google.com/?q=La+Mar+Cebicheria+Lima",
    "countryCode": "+51",
    "phoneNumber": "987654321",
    "website": "https://lamarcebicheria.com",
    "latitude": -12.1234567,
    "longitude": -77.0234567,
    "instagramGallery": [],
    "createdBy": "6501234567890abcdef12345",
    "status": "published",
    "createdAt": "2024-01-22T14:30:00.000Z",
    "updatedAt": "2024-01-22T14:30:00.000Z"
  }
}
```

**Important:** The `gallery[].image` field is populated with the full MediaAsset object (not just ID). Payload automatically "populates" relationships.

**Field Reference:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | ✅ Yes | Unique establishment name |
| `location` | String | ✅ Yes | Location identifier (must exist in Locations collection) |
| `gallery` | Array | ✅ Yes | Min 1, max 20 images |
| `gallery[].image` | String | ✅ Yes | MediaAsset ID |
| `gallery[].altText` | String | ❌ No | Accessibility text (recommended) |
| `gallery[].caption` | String | ❌ No | Optional caption |
| `type` | String | ❌ No | See available types below |
| `address` | String | ❌ No | Google Maps URL |
| `countryCode` | String | ❌ No | Phone country code (e.g., "+51") |
| `phoneNumber` | String | ❌ No | Phone number without country code |
| `website` | String | ❌ No | Website URL |
| `latitude` | Number | ❌ No | Latitude coordinate |
| `longitude` | Number | ❌ No | Longitude coordinate |
| `status` | String | ❌ No | `draft` or `published` (default: `draft`) |

**Available Types for Dining:**
`restaurant`, `fast-food`, `food-truck`, `cafe`, `bar`, `pub`, `rooftop-bar`, `street-food`, `brewery`, `winery`, `seafood`, `italian`, `american`, `wine-bar`, `cocktail-bar`, `dive-bar`, `buffet`, `bakery`, `dessert`, `ice-cream`, `coffee-shop`, `tea-shop`, `juice-bar`, `smoothie-bar`, `pizza`

**Auto-Set Fields (don't include in request):**
- `createdBy` - Set to current user ID automatically
- `id` - Generated MongoDB ObjectId
- `createdAt`, `updatedAt` - Timestamps

**Error Responses:**

```json
// 400 Bad Request - Missing Required Field
{
  "errors": [
    {
      "message": "The following field is required: title",
      "field": "title"
    }
  ]
}

// 400 Bad Request - Invalid MediaAsset ID
{
  "errors": [
    {
      "message": "The following field is invalid: gallery.0.image",
      "field": "gallery.0.image",
      "value": "invalid-id-12345"
    }
  ]
}

// 400 Bad Request - Duplicate Title
{
  "errors": [
    {
      "message": "Value must be unique",
      "field": "title"
    }
  ]
}
```

---

### 4. Other Collections

**All collections share the same field structure.** The ONLY difference is the available `type` options.

#### POST `/api/accommodations`

Create accommodation entries (hotels, hostels, resorts, etc.)

**Available Types:**
- `hotel`
- `hostel`
- `resort`
- `vacation-rental`
- `villa`
- `guesthouse`
- `boutique`
- `budget`

**All Fields:** Same as dining (title, location, gallery, address, etc.)

**Example Request:**
```json
{
  "title": "Sunset Beach Hotel",
  "type": "hotel",
  "location": "lima-peru",
  "gallery": [
    { "image": "65abc123...", "altText": "Hotel exterior" }
  ],
  "address": "https://maps.google.com/?q=...",
  "status": "published"
}
```

---

#### POST `/api/attractions`

Create attraction entries (museums, beaches, historical sites, etc.)

**Available Types:**
- `museum`
- `beach`
- `hiking-trail`
- `historical-site`
- `adventure-park`
- `gallery`
- `monument`
- `national-park`
- `workshop-class`

**All Fields:** Same as dining (title, location, gallery, address, etc.)

**Example Request:**
```json
{
  "title": "Machu Picchu",
  "type": "historical-site",
  "location": "cusco-peru",
  "gallery": [
    { "image": "65def456...", "altText": "Machu Picchu ruins" }
  ],
  "status": "published"
}
```

---

#### POST `/api/nightlife`

Create nightlife entries (nightclubs, bars, lounges, etc.)

**Available Types:**
- `nightclub`
- `rooftop-bar`
- `lounge`
- `karaoke`
- `live-music-venue`
- `speakeasy`
- `comedy-club`
- `pub`

**All Fields:** Same as dining (title, location, gallery, address, etc.)

**Example Request:**
```json
{
  "title": "Sky Lounge",
  "type": "rooftop-bar",
  "location": "lima-peru",
  "gallery": [
    { "image": "65ghi789...", "altText": "Rooftop bar view" }
  ],
  "status": "published"
}
```

---

### Collection Comparison Table

| Collection | Endpoint | Purpose | Example Types |
|------------|----------|---------|---------------|
| **Dining** | `/api/dining` | Restaurants, cafes, bars | `restaurant`, `cafe`, `bar`, `seafood`, `bakery` |
| **Accommodations** | `/api/accommodations` | Hotels, hostels, rentals | `hotel`, `hostel`, `resort`, `villa` |
| **Attractions** | `/api/attractions` | Museums, beaches, sites | `museum`, `beach`, `historical-site`, `national-park` |
| **Nightlife** | `/api/nightlife` | Clubs, lounges, venues | `nightclub`, `rooftop-bar`, `lounge`, `live-music-venue` |

**All collections have identical fields:**
- Required: `title`, `location`, `gallery` (min 1 image)
- Optional: `type`, `address`, `countryCode`, `phoneNumber`, `website`, `latitude`, `longitude`, `status`

---

### Gallery Array Structure

**IMPORTANT:** What you send vs. what you receive:

**In Request (what you send):**
```json
{
  "gallery": [
    {
      "image": "65abc123def4567890123456",  // Just the ID string
      "altText": "Description",
      "caption": "Optional caption"
    }
  ]
}
```

**In Response (what you receive):**
```json
{
  "gallery": [
    {
      "image": {
        "id": "65abc123def4567890123456",  // Full object!
        "filename": "...",
        "url": "...",
        // ... all MediaAsset fields
      },
      "altText": "Description",
      "caption": "Optional caption",
      "id": "65item123..."  // Auto-generated gallery item ID
    }
  ]
}
```

Payload automatically "populates" relationships, so you send just the ID but receive the full object.

---

## Testing & Troubleshooting

### Quick Test Script

```javascript
async function testIntegration() {
  try {
    // 1. Authenticate
    console.log('1. Authenticating...');
    await authenticate();
    console.log('   ✓ Success');

    // 2. Upload test image
    console.log('2. Uploading test image...');
    const testImageId = await uploadImage(
      testImageFile,
      'Test image for integration',
      'lima-peru'
    );
    console.log('   ✓ Image uploaded:', testImageId);

    // 3. Create test entry
    console.log('3. Creating test dining entry...');
    const entry = await createDining({
      title: `Test Restaurant ${Date.now()}`,
      location: 'lima-peru',
      gallery: [{ image: testImageId, altText: 'Test image' }],
      status: 'draft',
    });
    console.log('   ✓ Entry created:', entry.id);

    // 4. Verify it exists
    console.log('4. Verifying entry...');
    const response = await authenticatedFetch(
      `${BACKEND_URL}/api/dining/${entry.id}`
    );
    const retrieved = await response.json();
    console.log('   ✓ Entry verified');

    console.log('\n✓✓✓ ALL TESTS PASSED! ✓✓✓');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error.message);
    console.error(error);
  }
}
```

### Testing with cURL

```bash
# 1. Login
curl -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"service-account@questurian.com","password":"your-password"}'

# 2. Upload Image (replace YOUR_TOKEN)
curl -X POST http://localhost:4000/api/media-assets \
  -H "Authorization: JWT YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "alt_text=Test image" \
  -F "location=lima-peru"

# 3. Create Entry (replace YOUR_TOKEN and IMAGE_ID)
curl -X POST http://localhost:4000/api/dining \
  -H "Content-Type: application/json" \
  -H "Authorization: JWT YOUR_TOKEN" \
  -d '{
    "title":"Test Restaurant",
    "location":"lima-peru",
    "gallery":[{"image":"IMAGE_ID","altText":"Test"}],
    "status":"draft"
  }'
```

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Success (GET/update) |
| 201 | Created | Success (POST create) |
| 400 | Bad Request | Validation error - check error message |
| 401 | Unauthorized | Invalid/expired token - re-authenticate |
| 403 | Forbidden | User doesn't have permission |
| 404 | Not Found | Resource doesn't exist |
| 413 | Payload Too Large | Image exceeds 5MB - compress it |
| 415 | Unsupported Media Type | Invalid file type - use jpeg/png/webp |
| 500 | Internal Server Error | Server error - check logs |

### Common Errors & Solutions

**"Authentication failed"**
- Check email/password are correct
- Verify service account exists and has `editor` or `admin` role

**"File size exceeds maximum allowed size of 5MB"**
- Compress image before upload
- Check file size: `file.size` should be < 5,242,880 bytes

**"File type not allowed"**
- Only jpeg, png, webp are allowed
- Check file extension and MIME type

**"The following field is required: title"**
- Missing required field in request
- Check all required fields are present: `title`, `location`, `gallery`

**"The following field is invalid: gallery.0.image"**
- MediaAsset ID doesn't exist
- Verify you're using the correct ID from upload response: `data.doc.id`

**"Value must be unique" (title field)**
- Title already exists in database
- Use unique titles for each entry

**"Token expired"**
- JWT token expired (7 days)
- Call `authenticate()` again to get new token
- Or use `authenticatedFetch()` which auto-retries

### Getting Valid Locations

```javascript
async function getValidLocations() {
  const response = await authenticatedFetch(`${BACKEND_URL}/api/locations`);
  const { docs } = await response.json();
  const validLocations = docs.map(loc => loc.slug);
  console.log('Valid locations:', validLocations);
  return validLocations;
}
```

### Verifying Created Entries

```javascript
// List all dining entries
async function listDining() {
  const response = await authenticatedFetch(
    `${BACKEND_URL}/api/dining?limit=100`
  );
  const { docs, totalDocs } = await response.json();
  console.log(`Total entries: ${totalDocs}`);
  return docs;
}

// Get single entry by ID
async function getEntry(id) {
  const response = await authenticatedFetch(
    `${BACKEND_URL}/api/dining/${id}`
  );
  return await response.json();
}

// Get entries by location
async function getByLocation(location) {
  const response = await authenticatedFetch(
    `${BACKEND_URL}/api/dining?where[location][equals]=${location}`
  );
  const { docs } = await response.json();
  return docs;
}
```

### Bulk Import

For importing many entries:

```javascript
async function bulkImport(entries, batchSize = 5) {
  const results = [];
  const errors = [];

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

    const batchResults = await Promise.allSettled(
      batch.map(async entry => {
        // Upload images
        const imageIds = await Promise.all(
          entry.images.map(img => uploadImage(img.file, img.altText, entry.location))
        );

        // Create entry
        return await createDining({
          ...entry.data,
          gallery: imageIds.map((id, idx) => ({
            image: id,
            altText: entry.images[idx].altText,
            caption: entry.images[idx].caption,
          })),
        });
      })
    );

    // Collect results
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push({ entry: batch[idx], error: result.reason });
      }
    });

    // Pause between batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return { results, errors };
}

// Usage
const { results, errors } = await bulkImport(myDataset, 5);
console.log(`✓ Imported: ${results.length}`);
console.log(`✗ Failed: ${errors.length}`);
```

---

## Security Best Practices

### 1. Credential Storage

**❌ DON'T:**
```javascript
const SERVICE_EMAIL = 'service-account@questurian.com'; // Hardcoded!
const SERVICE_PASSWORD = 'my-password'; // In source code!
```

**✅ DO:**
```javascript
// .env file (add to .gitignore!)
SERVICE_EMAIL=service-account@questurian.com
SERVICE_PASSWORD=your-strong-password
BACKEND_URL=http://localhost:4000

// In code
require('dotenv').config();
const SERVICE_EMAIL = process.env.SERVICE_EMAIL;
const SERVICE_PASSWORD = process.env.SERVICE_PASSWORD;
```

### 2. Token Management

- JWT tokens expire after **7 days**
- Store token in **memory** (not disk) for security
- Re-authenticate automatically on 401 errors
- Don't share tokens between different apps

### 3. Access Control

- Service account should have **minimum required role** (`editor` is sufficient)
- Don't use `admin` role unless necessary
- Monitor service account usage in Payload admin panel

---

## Summary

### What You Need to Do

1. ✅ Create service account with `editor` or `admin` role
2. ✅ Store credentials in `.env` file
3. ✅ Implement authentication → get JWT token
4. ✅ Implement image upload → get MediaAsset IDs
5. ✅ Implement data entry creation → use MediaAsset IDs in gallery
6. ✅ Test with sample data

### The Complete Flow

```javascript
// 1. Login
await authenticate();

// 2. Upload images (sequential or parallel)
const id1 = await uploadImage(file1, 'Alt text 1', 'lima-peru');
const id2 = await uploadImage(file2, 'Alt text 2', 'lima-peru');
const id3 = await uploadImage(file3, 'Alt text 3', 'lima-peru');

// 3. Create entry with IDs (works for all collections!)

// Option A: Dining
await createDining({
  title: "Restaurant Name",
  type: "seafood",
  location: "lima-peru",
  gallery: [
    { image: id1, altText: "Alt 1", caption: "Caption 1" },
    { image: id2, altText: "Alt 2", caption: "Caption 2" },
    { image: id3, altText: "Alt 3", caption: "Caption 3" },
  ],
  status: "published",
});

// Option B: Accommodation
await createAccommodation({
  title: "Hotel Name",
  type: "hotel",
  location: "lima-peru",
  gallery: [{ image: id1, altText: "Hotel photo" }],
  status: "published",
});

// Option C: Attraction
await createAttraction({
  title: "Site Name",
  type: "historical-site",
  location: "cusco-peru",
  gallery: [{ image: id1, altText: "Site photo" }],
  status: "published",
});

// Option D: Nightlife
await createNightlife({
  title: "Club Name",
  type: "nightclub",
  location: "lima-peru",
  gallery: [{ image: id1, altText: "Club photo" }],
  status: "published",
});

// Option E: Generic (works for any collection)
await createEntry('dining', { /* data */ });
await createEntry('accommodations', { /* data */ });
await createEntry('attractions', { /* data */ });
await createEntry('nightlife', { /* data */ });
```

### Critical Points to Remember

- **Sequential process is mandatory** - Images first, data entry second
- **Response = Confirmation** - When `/api/media-assets` responds, Bunny upload is complete
- **No Bunny.net connection needed** - Plugin handles CDN automatically
- **Store IDs immediately** - Each MediaAsset ID is ready to use
- **Gallery must have min 1 image** - First image = featured image
- **Titles must be unique** - No duplicates allowed

### Additional Resources

- **Payload REST API Docs:** https://payloadcms.com/docs/rest-api/overview
- **Collection Schemas:** `/src/features/data/*/collections/`
- **Bunny.net Plugin:** `@seshuk/payload-storage-bunny`
- **Server Configuration:** `/src/payload.config.ts`

### Support

**If you have issues:**
1. Check server logs for detailed error messages
2. Verify service account has correct role (`editor` or `admin`)
3. Ensure all required environment variables are set in server `.env.local`
4. Test with Payload admin panel first at `http://localhost:4000/admin`

**You're ready to build!** 🚀
