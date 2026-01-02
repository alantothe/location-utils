# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A location management full-stack application built with Bun, Hono (backend), Vite + React (frontend), and Python AI services. Manages locations with Google Maps URLs, Instagram embeds, and uploaded images with automatic AI-generated alt text. Uses SQLite for persistence with a normalized three-table schema (`locations`, `instagram_embeds`, `uploads`) plus a separate location hierarchy/taxonomy system.

**Monorepo Structure:** Uses Turborepo to manage four packages: `server` (backend), `client` (frontend), `shared` (common types/utils), and `python-alt-text` (AI alt text generation service).

## Development Commands

**Run the full stack (recommended):**
```bash
bun run dev  # Starts both server and client via Turborepo
```

**Run packages individually:**
```bash
# Server only (port 3000)
cd packages/server && bun run dev

# Client only (port 5173)
cd packages/client && bun run dev

# Python AI alt text service only (port 8000)
bun run dev:python

# Client commands
cd packages/client
bun run build                # Build for production
bun run lint                 # Run ESLint
bun run preview              # Preview production build
```

**Build for production:**
```bash
bun run build                # Builds all packages via Turborepo
bun run clean                # Clean build artifacts
```

**Environment:**
- Server runs on `PORT=3000` by default
- Client runs on `PORT=5173` with API proxy to server
- Python AI service runs on `http://localhost:8000`
- Set `GOOGLE_MAPS_API_KEY`, `RAPID_API_KEY`, and `ALT_TEXT_API_URL` in `packages/server/.env` for full functionality

## Architecture

### Monorepo Structure
```
url-util/
├── packages/
│   ├── server/          # Backend package (Bun + Hono)
│   ├── client/          # Frontend package (Vite + React)
│   ├── shared/          # Shared types and utilities
│   └── python-alt-text/ # Python AI alt text generation service
├── turbo.json          # Turborepo configuration
└── package.json        # Workspace root
```

### Entry Point & Server
- `packages/server/src/server/main.ts` starts the Bun/Hono server and initializes the database
- `packages/server/src/shared/http/server.ts` exports the Hono `app` instance with global error handling via `app.onError()`
- Routes are auto-registered via side-effect imports in `packages/server/src/features/locations/routes/location.routes.ts`
- Database initialized via `initDb()` which auto-migrates from old unified schema to new normalized schema if needed
- Global error handler catches all errors and returns standardized JSON responses

### Feature Organization (Server)
```
packages/server/src/features/locations/
├── controllers/          # Thin HTTP handlers (consolidated files)
│   ├── locations.controller.ts       # GET /api/locations, GET /api/locations/:id, DELETE /api/locations/:id
│   ├── maps.controller.ts           # POST /api/add-maps, /api/update-maps
│   ├── instagram.controller.ts      # POST /api/add-instagram
│   ├── uploads.controller.ts        # POST /api/add-upload (multipart)
│   ├── files.controller.ts          # POST /api/open-folder, GET /packages/server/data/images/*
│   ├── hierarchy.controller.ts      # GET /api/location-hierarchy/*
│   └── admin.controller.ts          # GET /api/clear-db
├── services/            # Business logic classes with dependency injection
│   ├── maps.service.ts
│   ├── instagram.service.ts
│   ├── uploads.service.ts
│   ├── location-query.service.ts
│   └── location.helper.ts
├── repositories/        # Database queries (separated by table)
│   ├── location.repository.ts
│   ├── instagram-embed.repository.ts
│   ├── upload.repository.ts
│   └── location-hierarchy.repository.ts
├── validation/          # Zod validation schemas
│   └── schemas/
│       ├── locations.schemas.ts     # GET query params, DELETE :id validation
│       ├── maps.schemas.ts
│       ├── instagram.schemas.ts
│       └── uploads.schemas.ts
├── container/           # Dependency injection container
│   └── service-container.ts
├── models/              # TypeScript types and interfaces
├── routes/              # Route registration (auto-imported by main.ts)
├── utils/               # Location parsing/formatting helpers
└── scripts/             # Runnable scripts (seed, test)
```

### Frontend Architecture (Client)

The client package uses Vite + React (not Bun's built-in HTML imports):
- **React 19** with React Router for routing
- **TanStack Query (React Query)** for server state management and API caching
- **Zustand** for client-side state management
- **Vite** for build tooling, dev server, and HMR
- Client runs on port 5173 with proxy to backend on port 3000 (configured in `vite.config.ts`)

**Note:** While Bun supports serving frontends via `Bun.serve()` with HTML imports, this project intentionally uses Vite for the client package to leverage its mature ecosystem, fast HMR, and plugin system.

**UI Components:**
- **Shadcn UI** - Uses the new Field-based component system (not the deprecated Form component)
- **Tailwind CSS v4** - Utility-first CSS framework
- **Radix UI** - Headless UI primitives for accessibility
- **React Hook Form** - Form state management with Zod validation
- Components configured in `components.json` with path aliases (`@client/components`, `@client/lib/utils`)

**Form Patterns:**
- Use reusable form components in `src/components/forms/` (`FormBase`, `FormInput`, `FormSelect`)
- Follow Shadcn's Field API with `<Field>`, `<FieldLabel>`, `<FieldError>`, `<FieldContent>`
- Integrate with React Hook Form using `<Controller>` pattern
- See `docs/shadcn-field-migration-guide.md` for detailed form implementation patterns

**Client File Structure:**
```
packages/client/src/
├── components/
│   ├── forms/          # Reusable form wrappers (FormInput, FormSelect, FormBase)
│   └── ui/             # Shadcn UI components (button, input, select, field, label)
├── features/           # Feature-specific components and logic
│   └── locations/      # Location-related features
├── lib/                # Utility functions (cn, utils)
├── pages/              # Route pages (Home, AddLocation, etc.)
└── index.css           # Tailwind directives and global styles
```

**React Query Patterns:**
- **Lazy Loading**: Use `enabled` flag for conditional data fetching (e.g., `useLocationDetail` only fetches when `isExpanded && id !== null`)
- **Query Keys**: Use descriptive arrays for cache keys (e.g., `["location-detail", id]`)
- **Export Query Keys**: Export constants like `LOCATION_DETAIL_QUERY_KEY` for invalidation in mutations
- **Optimistic Updates**: Invalidate related queries after mutations to keep UI in sync

### Shared Package

The `shared` package (`packages/shared`) contains common TypeScript types and utilities used by both server and client:
- Exported via `packages/shared/src/index.ts`
- Consumed as `@url-util/shared` workspace dependency
- No build step - TypeScript files imported directly
- Keep shared code minimal and framework-agnostic

### Shared Code (Server)
```
packages/server/src/shared/
├── http/                # Hono server instance with error handling
│   └── server.ts       # Exports app with onError() handler
├── db/                  # Database client and migrations
│   ├── client.ts       # initDb(), getDb(), closeDb()
│   └── migrations/      # Schema migration scripts
├── config/              # Environment configuration
│   └── env.config.ts   # Singleton EnvConfig service
├── core/                # Core infrastructure
│   ├── errors/         # Custom error classes
│   │   └── http-error.ts  # HttpError, BadRequestError, NotFoundError, ValidationError, etc.
│   ├── middleware/     # Hono middleware
│   │   └── validation.middleware.ts  # Zod validation middleware
│   └── types/          # Shared types
│       └── api-response.ts  # Standardized response types
├── services/            # Shared services
│   ├── storage/        # File storage
│   │   └── image-storage.service.ts  # ImageStorageService for uploads/downloads
│   └── external/       # External API clients
│       └── instagram-api.client.ts  # InstagramApiClient for RapidAPI
└── utils/               # Country codes and other utilities
```

### Python AI Alt Text Service

The `python-alt-text` package (`packages/python-alt-text`) provides AI-powered alt text generation for uploaded images:

**Service Architecture:**
- **Framework**: Flask + Python
- **AI Model**: BLIP (Bootstrapping Language-Image Pre-training) for image captioning
- **API**: RESTful endpoints served on port 8000
- **Integration**: Called by Bun server during image upload processing

**API Endpoints:**
- `POST /alt` - Generate alt text for uploaded image (multipart/form-data)
- `GET /test` - Health check endpoint

**Integration Points:**
- `AltTextApiClient` in `packages/server/src/shared/services/external/alt-text-api.client.ts`
- Integrated in `UploadsService.addUploadFiles()` and `UploadsService.addImageSetUpload()`
- Graceful fallback when service unavailable - uploads continue without alt text
- Environment configurable via `ALT_TEXT_API_URL` in `packages/server/.env`

**Development Commands:**
```bash
# Install Python dependencies
bun run install:python-deps

# Run Python service only
bun run dev:python

# Test Python service connectivity
bun run test:python
```

### Data Storage
- `packages/server/data/location.sqlite` - SQLite database
- `packages/server/data/images/{location}/instagram/{timestamp}/` - Downloaded Instagram images
- `packages/server/data/images/{location}/uploads/{timestamp}/` - Direct uploads
- `packages/server/src/data/locations/` - Hierarchical TypeScript source data for location taxonomy

## Database Schema

### Normalized Tables (current)

**`locations`** - Main locations (formerly `type='maps'`)
- Primary table for restaurants, attractions, etc.
- Fields: `id`, `name`, `title`, `address`, `url`, `images`, `lat`, `lng`, `category`, `dining_type`, `locationKey`, `contactAddress`, `countryCode`, `phoneNumber`, `website`
- Unique constraint on `(name, address)`

**`instagram_embeds`** - Instagram posts linked to locations (formerly `type='instagram'`)
- Foreign key to `locations.id` via `location_id`
- Fields: `id`, `location_id`, `name`, `address`, `url`, `embed_code`, `instagram`, `images`, `original_image_urls`
- ON DELETE CASCADE

**`uploads`** - Directly uploaded images (formerly `type='upload'`)
- Foreign key to `locations.id` via `location_id`
- Fields: `id`, `location_id`, `name`, `address`, `url`, `images`
- ON DELETE CASCADE

**`location_taxonomy`** - Hierarchical location data (country → city → neighborhood)
- Fields: `id`, `country`, `city`, `neighborhood`, `locationKey` (pipe-delimited: `colombia|bogota|chapinero`)
- Unique constraint on `locationKey`

### Migration Strategy
The database auto-migrates from old unified `location` table (with `type` column) to new normalized schema on server start if old schema is detected. See `packages/server/src/shared/db/migrations/split-location-tables.ts`.

## Location Hierarchy System

Uses pipe-delimited strings (`country|city|neighborhood`) stored in the `location_taxonomy` table. The taxonomy is **dynamically generated** based on actual location usage - no manual seeding required!

**How it works:**
1. When creating/updating a location with a `locationKey` (e.g., `colombia|bogota|chapinero`)
2. The system automatically checks if that taxonomy entry exists
3. If not, creates it with `status='pending'` for admin review
4. Admin can approve/reject pending entries via `/api/admin/taxonomy/pending`

**Adding new locations:**
1. Create a location with any `locationKey` (e.g., `brazil|rio-de-janeiro|copacabana`)
2. System auto-creates pending taxonomy entry
3. Admin reviews and approves via admin panel
4. Approved entries appear in frontend dropdowns

**Taxonomy API endpoints:**
- `GET /api/admin/taxonomy/pending` - View pending taxonomy entries
- `PATCH /api/admin/taxonomy/:locationKey/approve` - Approve pending entry
- `DELETE /api/admin/taxonomy/:locationKey/reject` - Reject and delete pending entry
- `GET /api/location-hierarchy/countries` - Get all approved countries (nested with cities/neighborhoods)
- `GET /api/countries` - Get country names only

**Key utilities:**
- `parseLocationValue()` - Parse pipe-delimited string to object
- `formatLocationForDisplay()` - Format as "Colombia > Bogota > Chapinero"
- `filterCitiesByCountry()`, `filterNeighborhoodsByCity()` - Cascading filters
- `isLocationInScope()` - Check if location matches hierarchy scope
- `ensureTaxonomyEntry()` - Auto-create pending taxonomy (called by MapsService)

## Code Style

- TypeScript with ES modules; prefer async/await
- 2-space indentation, semicolons, double quotes
- `camelCase` for variables/functions, `PascalCase` for types/interfaces
- Kebab-case for filenames (`location-utils.ts`, `maps.service.ts`)
- Keep feature folders cohesive: controller → service → repository → model/util
- Avoid cross-feature imports unless shared

## Working with Shadcn UI

**Adding new components:**
```bash
cd packages/client
npx shadcn@latest add <component-name>
```

**Key points:**
- Components are added to `src/components/ui/` and can be customized
- Use the Field API for forms (not the deprecated Form component)
- Tailwind CSS v4 is configured with `@tailwindcss/postcss`
- Path aliases are configured: `@client/components`, `@client/lib/utils`, `@client/components/ui`
- The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes properly

## Architecture Improvements (December 2025 Refactoring)

The codebase underwent a comprehensive refactoring to improve maintainability, type safety, and testability:

### Key Improvements

1. **Dependency Injection**: All services use constructor injection via `ServiceContainer`
   - Services are singletons managed by the container
   - Easy to mock for testing
   - Clear dependency graph

2. **Validation with Zod**: Request validation using Zod schemas
   - Type-safe validation with auto-generated TypeScript types
   - Centralized validation logic in `validation/schemas/`
   - Consistent error messages across endpoints

3. **Standardized Error Handling**: Custom error classes with proper HTTP status codes
   - `BadRequestError`, `NotFoundError`, `ValidationError`, etc.
   - Global error handler via `app.onError()` in `server.ts`
   - Consistent error response format: `{success: false, error: string, code: string, details?: any}`

4. **Eliminated Code Duplication**: Shared services extract common patterns
   - `ImageStorageService` handles all filesystem operations for images
   - `InstagramApiClient` encapsulates RapidAPI integration
   - `EnvConfig` centralizes environment variable access

5. **Improved Type Safety**: Reduced `any` types, proper error typing
   - DTOs generated from Zod schemas (`CreateMapsDto`, etc.)
   - Explicit error types instead of generic Error
   - Proper typing for all service methods

6. **Standardized Responses**: Consistent API response format
   - Success: `{success: true, data: {...}}`
   - Error: `{success: false, error: string, code?: string, details?: any}`
   - No more mixed response formats across endpoints

### Code Patterns to Follow

**Creating a new endpoint:**
1. Define Zod schema in `validation/schemas/`
2. Create controller function that uses `c.get("validatedBody")`
3. Service class method with DI dependencies
4. Apply `validateBody(schema)` middleware to route
5. Throw custom errors (e.g., `BadRequestError`) instead of generic errors

**Example controller pattern:**
```typescript
export async function postAddResource(c: Context) {
  const dto = c.get("validatedBody") as AddResourceDto;
  const entry = await container.resourceService.addResource(dto);
  return c.json(successResponse({ entry }));
}
```

**Example service pattern:**
```typescript
export class ResourceService {
  constructor(
    private readonly config: EnvConfig,
    private readonly storage: ImageStorageService
  ) {}

  async addResource(payload: AddResourceDto): Promise<Resource> {
    if (!payload.name) {
      throw new BadRequestError("Name required");
    }
    // Business logic here
  }
}
```

## API Patterns

**Controller responsibilities:**
- Parse and validate request body/params
- Call service layer for business logic
- Return JSON responses with `{ success: true, entry: {...} }` or `{ error: "..." }`

**Service responsibilities:**
- Business logic (e.g., geocoding, Instagram media download)
- Coordinate between multiple repositories
- Transform data between API and database formats

**Repository responsibilities:**
- Raw database queries using Bun SQLite
- Single table focus (one repository per table)
- Return database rows with minimal transformation

## Common Workflows

**Creating a maps location:**
1. POST `/api/add-maps` with `{ name, address, category }`
2. `maps.service.ts` geocodes via Google Maps API if key is set
3. `location.repository.ts` inserts into `locations` table
4. Returns transformed `LocationResponse` with nested contact, coordinates, and source objects

**Adding Instagram embed:**
1. POST `/api/add-instagram` with `{ embedCode, locationId }`
2. `instagram.service.ts` extracts permalink, downloads media via RapidAPI
3. `instagram-embed.repository.ts` inserts into `instagram_embeds` table
4. Images saved to `packages/server/data/images/{location}/instagram/{timestamp}/`

**Updating location:**
1. PATCH `/api/maps/:id` with flat fields (e.g., `{ title, category, phoneNumber, ... }`)
2. Validation rejects immutable fields (id, name, address, url, lat, lng, created_at) and nested objects
3. `location.repository.ts` performs partial update
4. Returns transformed `LocationResponse` with current nested embeds and uploads

**Querying locations:**
1. GET `/api/locations`
2. `location-query.service.ts` joins all three tables
3. Transforms flat database rows to `LocationResponse` format
4. Returns `locations` array with nested structure (contact, coordinates, source, instagram_embeds, uploads)

**Filtering locations:**
1. GET `/api/locations?category=dining&locationKey=colombia|bogota`
2. Query params validated via `listLocationsQuerySchema` (Zod)
3. `location-query.service.ts` filters by category and/or locationKey scope
4. Returns filtered `locations` array matching criteria

**Fetching single location:**
1. GET `/api/locations/:id` with numeric ID parameter
2. Validated via `deleteLocationIdSchema` (Zod)
3. `location-query.service.ts` fetches by ID, joins embeds/uploads
4. Returns `LocationResponse` or 404 if not found

## API Response Format

All location endpoints (GET, POST, PATCH) return a consistent nested response structure:

```json
{
  "id": 1,
  "title": "Panchita",
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
  "instagram_embeds": [...],
  "uploads": [...],
  "created_at": "2025-12-16 21:34:40"
}
```

**Key Points:**
- **Database stays flat** - nesting happens at the service layer via `transformLocationToResponse()`
- **Repositories return flat rows** - transformation is applied in `LocationQueryService` and `MapsService`
- **source object** preserves the original user input (name, address) as immutable data
- **contact object** contains all contact-related fields (countryCode, phoneNumber, website, contactAddress, url)
- **coordinates object** contains geocoded lat/lng (can be null if not geocoded)
- **PATCH requests accept flat fields only** - validation rejects nested objects (contact, coordinates, source)

## Testing

- Run `bun run test-routes.ts` when editing controllers or image serving
- For new logic, add lightweight Bun scripts near the feature with clear pass/fail output
- Validate API changes manually against `docs/url.md` while server runs
- Test taxonomy workflow by creating locations with new locationKeys and approving via admin panel

## Git Conventions

- Short, present-tense commit messages (e.g., "remove frontend", "reorder location fields")
- Scope commits to one behavior change
- Mention scripts run for verification
- Call out migrations to `location.sqlite` or folder layout changes in PRs
