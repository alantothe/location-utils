import type { LocationWithNested, LocationResponse } from "../models/location";
import { getAllLocations, getLocationsByCategory } from "../repositories/location.repository";
import { getAllInstagramEmbeds } from "../repositories/instagram-embed.repository";
import { getAllUploads } from "../repositories/upload.repository";
import { transformLocationToResponse, isLocationInScope } from "../utils/location-utils";

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
}
