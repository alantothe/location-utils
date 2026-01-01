import type { LocationWithNested, LocationResponse, LocationBasic } from "../../models/location";
import { getAllLocations, getLocationsByCategory, getLocationById } from "../../repositories/location.repository";
import { getAllInstagramEmbeds } from "../../repositories/instagram-embed.repository";
import { getAllUploads } from "../../repositories/upload.repository";
import { transformLocationToResponse, transformLocationToBasicResponse, isLocationInScope } from "../../utils/location-utils";

export class LocationQueryService {
  listLocations(category?: string, locationKey?: string): LocationResponse[] {
    // Step 1: Apply category filter at SQL level (efficient)
    let locations = category
      ? getLocationsByCategory(category)
      : getAllLocations();

    // Step 2: Apply locationKey filter in-memory using isLocationInScope utility
    if (locationKey) {
      locations = locations.filter(
        (loc) => loc.locationKey && isLocationInScope(loc.locationKey, locationKey)
      );
    }

    // Step 3: Fetch related data (existing pattern)
    const allEmbeds = getAllInstagramEmbeds();
    const allUploads = getAllUploads();

    // Step 4: Create LocationWithNested (existing pattern)
    const locationsWithNested: LocationWithNested[] = locations.map((loc) => ({
      ...loc,
      instagram_embeds: allEmbeds.filter((e) => e.location_id === loc.id),
      uploads: allUploads.filter((u) => u.location_id === loc.id),
    }));

    // Step 5: Transform to LocationResponse format
    return locationsWithNested.map(transformLocationToResponse);
  }

  listLocationsBasic(category?: string, locationKey?: string): LocationBasic[] {
    // Step 1: Apply category filter at SQL level (efficient)
    let locations = category
      ? getLocationsByCategory(category)
      : getAllLocations();

    // Step 2: Apply locationKey filter in-memory using isLocationInScope utility
    if (locationKey) {
      locations = locations.filter(
        (loc) => loc.locationKey && isLocationInScope(loc.locationKey, locationKey)
      );
    }

    // Step 3: Transform to basic LocationBasic format
    return locations.map(transformLocationToBasicResponse);
  }

  getLocationById(id: number): LocationResponse | null {
    // Step 1: Get location by ID
    const location = getLocationById(id);
    if (!location) {
      return null;
    }

    // Step 2: Fetch related data
    const allEmbeds = getAllInstagramEmbeds();
    const allUploads = getAllUploads();

    // Step 3: Create LocationWithNested
    const locationWithNested: LocationWithNested = {
      ...location,
      instagram_embeds: allEmbeds.filter((e) => e.location_id === location.id),
      uploads: allUploads.filter((u) => u.location_id === location.id),
    };

    // Step 4: Transform to LocationResponse format
    return transformLocationToResponse(locationWithNested);
  }
}
