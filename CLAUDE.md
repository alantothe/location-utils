# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A location management API built with Bun and Hono that manages locations with Google Maps URLs, Instagram embeds, and uploaded images. Uses SQLite for persistence with a normalized three-table schema (`locations`, `instagram_embeds`, `uploads`) plus a separate location hierarchy/taxonomy system.

## Development Commands

**Run the server:**
```bash
bun start
# or
bun run src/server/main.ts
```
Server runs on `PORT=3000` by default. Set `GOOGLE_MAPS_API_KEY` environment variable to enable geocoding.

**Seed location hierarchy:**
```bash
bun run seed:locations
# or
bun run src/features/locations/scripts/seed-locations.ts
```

**Test location utilities:**
```bash
bun run test:locations
# or
bun run src/features/locations/scripts/test-location-utils.ts
```

**Test route handlers:**
```bash
bun run test-routes.ts
```
Mock Hono contexts to exercise controllers without hitting the network.

## Architecture

### Entry Point & Server
- `src/server/main.ts` starts the Bun/Hono server and initializes the database
- `src/shared/http/server.ts` exports the Hono `app` instance
- Routes are auto-registered via side-effect imports in `src/features/locations/routes/location.routes.ts`
- Database initialized via `initDb()` which auto-migrates from old unified schema to new normalized schema if needed

### Feature Organization
```
src/features/locations/
├── controllers/          # HTTP handlers (one per route group)
│   ├── locations/       # GET /api/locations
│   ├── maps/            # POST /api/add-maps, /api/update-maps
│   ├── instagram/       # POST /api/add-instagram
│   ├── uploads/         # POST /api/add-upload (multipart)
│   ├── files/           # POST /api/open-folder, GET /src/data/images/*
│   ├── location-hierarchy/  # GET /api/location-hierarchy/*
│   └── clear-db/        # GET /api/clear-db
├── services/            # Business logic called by controllers
├── repositories/        # Database queries (separated by table)
│   ├── location.repository.ts
│   ├── instagram-embed.repository.ts
│   ├── upload.repository.ts
│   └── location-hierarchy.repository.ts
├── models/              # TypeScript types and interfaces
├── routes/              # Route registration (auto-imported by main.ts)
├── utils/               # Location parsing/formatting helpers
├── scripts/             # Runnable scripts (seed, test)
└── config/              # Location field configurations
```

### Shared Code
```
src/shared/
├── http/                # Hono server instance
├── db/                  # Database client and migrations
│   ├── client.ts       # initDb(), getDb(), closeDb()
│   └── migrations/      # Schema migration scripts
└── utils/               # Country codes and other utilities
```

### Data Storage
- `src/data/location.sqlite` - SQLite database
- `src/data/images/{location}/instagram/{timestamp}/` - Downloaded Instagram images
- `src/data/images/{location}/uploads/{timestamp}/` - Direct uploads
- `src/data/locations/` - Hierarchical TypeScript source data for location taxonomy

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
The database auto-migrates from old unified `location` table (with `type` column) to new normalized schema on server start if old schema is detected. See `src/shared/db/migrations/split-location-tables.ts`.

## Location Hierarchy System

Uses pipe-delimited strings (`country|city|neighborhood`) stored in a flat table with all possible combinations pre-generated from hierarchical source data.

**Source data structure:**
```
src/data/locations/
├── index.ts                    # Exports all countries
├── colombia/
│   ├── index.ts               # Country definition
│   └── bogota/
│       └── neighborhoods.ts   # Array of neighborhood objects
└── peru/
    └── ...
```

**Adding new locations:**
1. Edit TypeScript files in `src/data/locations/{country}/{city}/neighborhoods.ts`
2. Update country index to include new city/neighborhood
3. Re-run `bun run seed:locations` to regenerate database

**Key utilities:**
- `parseLocationValue()` - Parse pipe-delimited string to object
- `formatLocationForDisplay()` - Format as "Colombia > Bogota > Chapinero"
- `filterCitiesByCountry()`, `filterNeighborhoodsByCity()` - Cascading filters
- `isLocationInScope()` - Check if location matches hierarchy scope

## Code Style

- TypeScript with ES modules; prefer async/await
- 2-space indentation, semicolons, double quotes
- `camelCase` for variables/functions, `PascalCase` for types/interfaces
- Kebab-case for filenames (`location-utils.ts`, `maps.service.ts`)
- Keep feature folders cohesive: controller → service → repository → model/util
- Avoid cross-feature imports unless shared

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
1. POST `/api/add-maps` with `{ name, address }`
2. `maps.service.ts` geocodes via Google Maps API if key is set
3. `location.repository.ts` inserts into `locations` table
4. Returns full location object including lat/lng if geocoded

**Adding Instagram embed:**
1. POST `/api/add-instagram` with `{ embedCode, locationId }`
2. `instagram.service.ts` extracts permalink, downloads media via RapidAPI
3. `instagram-embed.repository.ts` inserts into `instagram_embeds` table
4. Images saved to `src/data/images/{location}/instagram/{timestamp}/`

**Updating location:**
1. POST `/api/update-maps` with `{ id, title, ... }`
2. If address changes and API key is set, re-geocode
3. `location.repository.ts` updates `locations` table
4. URL regenerated if name or address changed

**Querying locations:**
1. GET `/api/locations`
2. `location-query.service.ts` joins all three tables
3. Returns `locations` array with nested `instagram_embeds` and `uploads`

## Testing

- Run `bun run test:locations` after changing taxonomy helpers or location data
- Run `bun run test-routes.ts` when editing controllers or image serving
- For new logic, add lightweight Bun scripts near the feature with clear pass/fail output
- Validate API changes manually against `docs/url.md` while server runs

## Git Conventions

- Short, present-tense commit messages (e.g., "remove frontend", "reorder location fields")
- Scope commits to one behavior change
- Mention scripts run for verification
- Call out migrations to `location.sqlite` or folder layout changes in PRs
