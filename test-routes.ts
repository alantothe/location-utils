#!/usr/bin/env bun

import { getLocations, getLocationsBasic } from "./packages/server/src/features/locations/controllers/locations.controller";
import { patchMapsById } from "./packages/server/src/features/locations/controllers/maps.controller";
import { serveImage } from "./packages/server/src/features/locations/controllers/files.controller";
import {
  getLocationHierarchy,
  getCountries,
  getCountryNames,
  getCitiesByCountry,
  getNeighborhoodsByCity,
} from "./packages/server/src/features/locations/controllers/hierarchy.controller";

console.log("🚀 Testing URL Util Routes\n");

// Mock Hono Context for testing
function mockContext(params: Record<string, string> = {}, body?: any) {
  const contextData: Record<string, any> = {};
  return {
    req: {
      param: (key: string) => params[key],
      json: () => Promise.resolve(body || {}),
      path: "/test",
    },
    json: (data: any, status = 200) => {
      console.log(`    📄 Response (${status}):`, JSON.stringify(data, null, 2));
      return { status, data };
    },
    text: (text: string, status = 200) => {
      console.log(`    📄 Response (${status}):`, text);
      return { status, text };
    },
    get: (key: string) => contextData[key],
    set: (key: string, value: any) => { contextData[key] = value; },
  };
}

async function testRoute(name: string, handler: Function, context: any, expectedStatus = 200) {
  try {
    console.log(`  Testing ${name}...`);
    const result = await handler(context);

    if (result && result.status === expectedStatus) {
      console.log(`    ✅ ${name} - Status: ${result.status}`);
    } else if (result && result.status !== expectedStatus) {
      console.log(`    ❌ ${name} - Status: ${result.status} (expected ${expectedStatus})`);
    } else {
      console.log(`    ✅ ${name} - Handler executed successfully`);
    }
  } catch (error: any) {
    console.log(`    ❌ ${name} - Error: ${error.message}`);
  }
  console.log();
}

// Test Location Routes
console.log("📍 Testing Location Routes:");

// Test GET /api/locations
const locationsContext = mockContext();
locationsContext.set("validatedQuery", {});
await testRoute("GET /api/locations", getLocations, locationsContext);

// Test GET /api/locations-basic
const locationsBasicContext = mockContext();
locationsBasicContext.set("validatedQuery", {});
await testRoute("GET /api/locations-basic", getLocationsBasic, locationsBasicContext);

// Test PATCH /api/locations/:id (non-existent ID to test error handling)
const patchContext = mockContext({ id: "99999" }, { title: "Updated Title" });
patchContext.set("validatedBody", { title: "Updated Title" });
await testRoute("PATCH /api/locations/99999 (non-existent)", patchMapsById, patchContext, 404);

// Test Location Hierarchy Routes
console.log("🏛️  Testing Location Hierarchy Routes:");

// Test GET /api/location-hierarchy
await testRoute("GET /api/location-hierarchy", getLocationHierarchy, mockContext());

// Test GET /api/location-hierarchy/countries
await testRoute("GET /api/location-hierarchy/countries", getCountries, mockContext());

// Test GET /api/countries
await testRoute("GET /api/countries", getCountryNames, mockContext());

// Test GET /api/location-hierarchy/cities/colombia
await testRoute("GET /api/location-hierarchy/cities/colombia", getCitiesByCountry, mockContext({ country: "colombia" }));

// Test GET /api/location-hierarchy/neighborhoods/colombia/bogota
await testRoute("GET /api/location-hierarchy/neighborhoods/colombia/bogota", getNeighborhoodsByCity, mockContext({ country: "colombia", city: "bogota" }));

// Test Image Serving Route
console.log("🖼️  Testing Image Serving Route:");

// Test GET /src/data/images/* (existing image)
const existingImageContext = mockContext({}, undefined);
existingImageContext.req.path = "/src/data/images/m_rito/instagram/1765472312486/image_0.jpg";
await testRoute("GET /src/data/images/m_rito/instagram/1765472312486/image_0.jpg", serveImage, existingImageContext);

// Test GET /src/data/images/* (non-existing image)
const nonExistingImageContext = mockContext({}, undefined);
nonExistingImageContext.req.path = "/src/data/images/nonexistent.jpg";
await testRoute("GET /src/data/images/nonexistent.jpg", serveImage, nonExistingImageContext, 404);

console.log("✨ Route testing completed!");
