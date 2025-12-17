#!/usr/bin/env bun

import { getLocations } from "./src/features/locations/controllers/locations.controller";
import { serveImage } from "./src/features/locations/controllers/files.controller";
import {
  getLocationHierarchy,
  getCountries,
  getCitiesByCountry,
  getNeighborhoodsByCity,
} from "./src/features/locations/controllers/hierarchy.controller";

console.log("🚀 Testing URL Util Routes\n");

// Mock Hono Context for testing
function mockContext(params: Record<string, string> = {}, body?: any) {
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
await testRoute("GET /api/locations", getLocations, mockContext());

// Test Location Hierarchy Routes
console.log("🏛️  Testing Location Hierarchy Routes:");

// Test GET /api/location-hierarchy
await testRoute("GET /api/location-hierarchy", getLocationHierarchy, mockContext());

// Test GET /api/location-hierarchy/countries
await testRoute("GET /api/location-hierarchy/countries", getCountries, mockContext());

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
