# Location Manager with Instagram Integration

A full-stack location management application with Google Maps integration, Instagram content enrichment, and AI-powered alt text generation. Built with Bun, Hono (backend), Vite + React (frontend), and Python AI services in a monorepo structure.


<h2 style="margin-bottom: 0.5rem;">Backend (API):</h2>
<p>
<img alt="TypeScript" src="https://img.shields.io/badge/typescript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>
<img alt="Hono" src="https://img.shields.io/badge/hono-E36002?style=for-the-badge&logo=hono&logoColor=white"/>
<img alt="SQLite" src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white"/>


<h2 style="margin-bottom: 0.5rem;">Frontend (Client App):</h2>
<p>
<img alt="TypeScript" src="https://img.shields.io/badge/typescript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>
 <img alt="React" src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB"/>
<img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFC71F"/>



<h2 style="margin-bottom: 0.5rem;">AI Microservice:</h2>
<p>
<img alt="Python" src="https://img.shields.io/badge/Python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54"/>
<img alt="PyTorch" src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=PyTorch&logoColor=white"/>
<img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white"/>




## Features

- **Full-Stack Application**: React frontend with Hono API backend
- **Location Management**: Create and manage locations with Google Maps URLs
- **Instagram Integration**: Add Instagram embeds to locations with automatic image downloading
- **AI Alt Text Generation**: Automatic descriptive alt text for uploaded images using Python AI service
- **Hierarchical Location System**: Organize locations by country → city → neighborhood
- **Image Management**: Automatically downloads and organizes Instagram images with AI-generated alt text
- **SQLite Persistence**: Normalized database schema with three tables
- **API Proxy**: Vite dev server proxies API requests to backend

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime installed

### Installation

```bash
# Clone and install
git clone <repo-url>
cd url-util
bun install
```

### Development

**Run full stack (recommended):**
```bash
bun run dev  # Starts both server and client
```

**Run individually:**
```bash
# Terminal 1 - Backend (http://localhost:3000)
cd packages/server
bun run dev

# Terminal 2 - Frontend (http://localhost:5173)
cd packages/client
bun run dev
```

### Environment Setup

Create `packages/server/.env`:
```env
PORT=3000
GOOGLE_MAPS_API_KEY=your_key_here
RAPID_API_KEY=your_rapid_api_key
ALT_TEXT_API_URL=http://localhost:8000
```

### Python AI Service

The application includes an optional Python AI service for automatic alt text generation:

```bash
# Install Python dependencies
bun run install:python-deps

# Run Python service (port 8000)
bun run dev:python

# Test service connectivity
bun run test:python
```

## Monorepo Structure

```
url-util/
├── packages/
│   ├── server/          # Backend (Bun + Hono)
│   │   ├── src/         # Server source code
│   │   └── data/        # SQLite database & images
│   ├── client/          # Frontend (Vite + React)
│   │   └── src/         # React application
│   ├── shared/          # Shared types & utilities
│   └── python-alt-text/ # Python AI alt text service
├── turbo.json          # Turborepo config
└── package.json        # Workspace root
```

## API Endpoints

- `GET /api/locations` - List all locations with filters
- `POST /api/add-maps` - Create location from Google Maps
- `PATCH /api/maps/:id` - Update location
- `POST /api/add-instagram/:id` - Add Instagram embed
- `POST /api/add-upload/:id` - Upload images
- `GET /api/images/*` - Serve uploaded/downloaded images
- `GET /api/location-hierarchy` - Get location hierarchy

## Database Schema

- **locations** - Main location table (name, address, coordinates, category)
- **instagram_embeds** - Instagram posts linked to locations
- **uploads** - Direct image uploads
- **location_taxonomy** - Hierarchical location data (country|city|neighborhood)

## Server Commands

```bash
cd packages/server

bun run dev               # Start dev server
bun run seed:locations    # Seed location hierarchy
bun run test:locations    # Run location utils tests
```

## Tech Stack

**Backend:**
- Bun runtime
- Hono web framework
- SQLite (bun:sqlite)
- Zod validation

**Frontend:**
- Vite build tool
- React 19
- TypeScript
- Path aliases (@client/*, @shared/*)

**AI Services:**
- Python Flask API
- BLIP image captioning model
- Automatic alt text generation

**Monorepo:**
- Turborepo for task orchestration
- Bun workspaces
- Shared package for types/utils

## Development Notes

- Server runs on port 3000
- Client runs on port 5173 with API proxy
- Python AI service runs on port 8000
- Images stored in `packages/server/data/images/`
- Database at `packages/server/data/location.sqlite`
- Hot reload enabled for both frontend and backend
- AI alt text generation runs asynchronously during uploads

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed architecture documentation and development guidelines.
