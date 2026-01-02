# Plan: Add Python Alt Text Service to url-util Monorepo (Option 1)

## Overview
Add the Python AI alt text generation service as a new package (`packages/python-alt-text`) to the url-util monorepo, enabling the location management app to automatically generate alt text for uploaded images.

## Step-by-Step Implementation Plan

### Phase 1: Package Structure Setup

**1.1 Create Package Directory**
```
mkdir packages/python-alt-text
```

**1.2 Copy Python Service Files**
- Copy `app.py`, `requirements.txt`, `README.md` from `/Users/alanmalpartida/Desktop/workspace/img-alt-maker/python/`
- Rename `README.md` to `README-python.md` to avoid conflicts

**1.3 Create package.json**
```json
{
  "name": "@url-util/python-alt-text",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "python app.py",
    "install-deps": "pip install -r requirements.txt",
    "test": "python -c \"import app; print('Service imports successfully')\""
  }
}
```

**1.4 Add .gitignore for Python**
```bash
# packages/python-alt-text/.gitignore
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.tox/
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
```

### Phase 2: Turborepo Integration

**2.1 Update turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "outputs": ["dist/**"]
    },
    "install-deps": {
      "cache": false
    },
    "test": {
      "cache": false
    },
    "test:locations": {
      "cache": false
    },
    "seed:locations": {
      "cache": false
    }
  }
}
```

**2.2 Update Root package.json Scripts**
```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:python": "turbo dev --filter=@url-util/python-alt-text",
    "install:python-deps": "turbo install-deps --filter=@url-util/python-alt-text",
    "build": "turbo build",
    "clean": "turbo clean"
  }
}
```

### Phase 3: Service Integration

**3.1 Update Bun Server to Call Python Service**
Add new service in `packages/server/src/shared/services/external/`:

```typescript
// alt-text-api.client.ts
export class AltTextApiClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async generateAltText(imageBuffer: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), filename);

    const response = await fetch(`${this.baseUrl}/alt`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Alt text generation failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.alt;
  }
}
```

**3.2 Register in Service Container**
Update `packages/server/src/features/locations/container/service-container.ts`:

```typescript
import { AltTextApiClient } from '../../../shared/services/external/alt-text-api.client';

export class ServiceContainer {
  // ... existing services ...

  get altTextApiClient(): AltTextApiClient {
    return new AltTextApiClient();
  }
}
```

**3.3 Integrate in Image Processing**
Update image upload service to generate alt text:

```typescript
// packages/server/src/features/locations/services/uploads.service.ts
export class UploadsService {
  constructor(
    private readonly storage: ImageStorageService,
    private readonly altTextApi: AltTextApiClient,
    // ... other deps
  ) {}

  async addUpload(locationId: number, files: File[]): Promise<UploadResult> {
    // ... existing upload logic ...

    // Generate alt text for each image
    const uploadsWithAltText = await Promise.all(
      uploads.map(async (upload) => {
        try {
          const imageBuffer = await this.storage.readImage(upload.imagePath);
          const altText = await this.altTextApi.generateAltText(imageBuffer, upload.filename);
          return { ...upload, altText };
        } catch (error) {
          console.warn(`Failed to generate alt text for ${upload.filename}:`, error);
          return upload; // Continue without alt text
        }
      })
    );

    return uploadsWithAltText;
  }
}
```

### Phase 4: Environment & Configuration

**4.1 Add Environment Variables**
Update `packages/server/.env`:
```env
PORT=3000
GOOGLE_MAPS_API_KEY=your_key_here
RAPID_API_KEY=your_rapid_api_key
ALT_TEXT_API_URL=http://localhost:8000
```

**4.2 Make Python Service Configurable**
Update `packages/server/src/shared/config/env.config.ts`:
```typescript
export class EnvConfig {
  // ... existing config ...

  get altTextApiUrl(): string {
    return process.env.ALT_TEXT_API_URL || 'http://localhost:8000';
  }
}
```

### Phase 5: Testing & Validation

**5.1 Add Test Scripts**
Create `packages/python-alt-text/test-connection.ts`:
```typescript
// Simple test to verify Python service is running
import { execSync } from 'child_process';

try {
  const result = execSync('curl -s http://localhost:8000/test', { encoding: 'utf8' });
  const response = JSON.parse(result);
  console.log('✅ Python alt text service is running:', response);
} catch (error) {
  console.error('❌ Python alt text service is not accessible:', error.message);
  process.exit(1);
}
```

**5.2 Update Root Test Script**
Add to `test-routes.ts` or create separate test script.

### Phase 6: Documentation Updates

**6.1 Update CLAUDE.md**
Add Python service section explaining:
- Service architecture
- API endpoints
- Integration points
- Development commands

**6.2 Update README.md**
Add Python service to the monorepo structure and development commands.

### Phase 7: Development Workflow

**7.1 Updated Commands**
```bash
# Install all dependencies (including Python)
bun install
cd packages/python-alt-text && pip install -r requirements.txt

# Run all services
bun run dev

# Run Python service only
bun run dev:python

# Test Python service
bun run test:python
```

**7.2 Health Checks**
- Python service: `GET http://localhost:8000/test`
- Full integration: Upload image via frontend and verify alt text generation

## Success Criteria

- ✅ All three services (React, Bun, Python) start with `bun run dev`
- ✅ Image uploads generate automatic alt text
- ✅ Alt text appears in location details and image metadata
- ✅ Graceful fallback when Python service is unavailable
- ✅ Environment-specific configuration (dev/prod)

## Risk Mitigation

- **Python Service Unavailable**: Add retry logic and fallback to manual alt text
- **Model Loading Time**: Pre-load models on startup, add health checks
- **Cross-Origin Issues**: Ensure CORS is configured for frontend calls to Python service
- **Performance**: Run alt text generation asynchronously to not block uploads

This plan maintains the clean architecture while adding powerful AI capabilities to your location management app.
