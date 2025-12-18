import type {
  LocationHierarchy,
  CountryData,
  CityData,
  NeighborhoodData,
  LocationWithNested,
  LocationResponse
} from '../models/location';

/**
 * Parse a pipe-delimited location key into its components
 * @param locationKey - Pipe-delimited string like "colombia|bogota|chapinero"
 * @returns Parsed location object or null if invalid
 */
export function parseLocationValue(locationKey: string): LocationHierarchy | null {
  if (!locationKey || typeof locationKey !== 'string') {
    return null;
  }

  const parts = locationKey.split('|');
  if (parts.length < 1 || parts.length > 3) {
    return null;
  }

  const [country, city, neighborhood] = parts;

  return {
    country,
    city: city || null,
    neighborhood: neighborhood || null,
    locationKey,
  };
}

/**
 * Format a location object for display (human-readable)
 * @param locationKey - Pipe-delimited location key
 * @returns Formatted display string like "Colombia > Bogota > Chapinero"
 */
export function formatLocationForDisplay(locationKey: string): string {
  const parsed = parseLocationValue(locationKey);
  if (!parsed) return locationKey;

  const parts: string[] = [];

  // Add country display name
  parts.push(formatLocationName(parsed.country));

  if (parsed.city) {
    parts.push(formatLocationName(parsed.city));
  }

  if (parsed.neighborhood) {
    parts.push(formatLocationName(parsed.neighborhood));
  }

  return parts.join(' > ');
}

/**
 * Format a location slug/name for display (convert kebab-case to Title Case)
 * @param slug - Slug like "santa-teresita"
 * @returns Display name like "Santa Teresita"
 */
export function formatLocationName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Filter locations to get all cities for a specific country
 * @param locations - Array of location hierarchy entries
 * @param country - Country code like "colombia"
 * @returns Array of city locations (country|city combinations)
 */
export function filterCitiesByCountry(locations: LocationHierarchy[], country: string): LocationHierarchy[] {
  return locations.filter(loc =>
    loc.country === country &&
    loc.city !== null &&
    loc.neighborhood === null
  );
}

/**
 * Filter locations to get all neighborhoods for a specific city
 * @param locations - Array of location hierarchy entries
 * @param country - Country code like "colombia"
 * @param city - City value like "bogota"
 * @returns Array of neighborhood locations (country|city|neighborhood combinations)
 */
export function filterNeighborhoodsByCity(locations: LocationHierarchy[], country: string, city: string): LocationHierarchy[] {
  return locations.filter(loc =>
    loc.country === country &&
    loc.city === city &&
    loc.neighborhood !== null
  );
}

/**
 * Get countries from location hierarchy (unique country entries)
 * @param locations - Array of location hierarchy entries
 * @returns Array of unique country locations
 */
export function getCountries(locations: LocationHierarchy[]): LocationHierarchy[] {
  const countryMap = new Map<string, LocationHierarchy>();

  locations.forEach(loc => {
    if (loc.city === null && loc.neighborhood === null && !countryMap.has(loc.country)) {
      countryMap.set(loc.country, loc);
    }
  });

  return Array.from(countryMap.values());
}

/**
 * Check if a location key matches or is a child of another location key
 * Used for filtering related locations (e.g., attractions in a city)
 * @param locationKey - The location key to check
 * @param parentLocationKey - The parent location key to match against
 * @returns True if locationKey matches or is a child of parentLocationKey
 */
export function isLocationInScope(locationKey: string, parentLocationKey: string): boolean {
  if (locationKey === parentLocationKey) {
    return true;
  }

  // Check if locationKey starts with parentLocationKey (indicating it's a child)
  return locationKey.startsWith(parentLocationKey + '|');
}

/**
 * Generate all possible location combinations from hierarchical data
 * @param countries - Array of country data with cities and neighborhoods
 * @returns Array of all possible location hierarchy entries
 */
export function generateLocationCombinations(countries: CountryData[]): LocationHierarchy[] {
  const locations: LocationHierarchy[] = [];

  countries.forEach(country => {
    // Add country-only entry
    locations.push({
      country: country.code,
      city: null,
      neighborhood: null,
      locationKey: country.code,
    });

    country.cities.forEach(city => {
      // Add country|city entry
      locations.push({
        country: country.code,
        city: city.value,
        neighborhood: null,
        locationKey: `${country.code}|${city.value}`,
      });

      // Add country|city|neighborhood entries
      city.neighborhoods.forEach(neighborhood => {
        locations.push({
          country: country.code,
          city: city.value,
          neighborhood: neighborhood.value,
          locationKey: `${country.code}|${city.value}|${neighborhood.value}`,
        });
      });
    });
  });

  return locations;
}

/**
 * Transform a flat location with nested arrays to the API response format
 * with contact, coordinates, and source objects
 * @param location - Location with nested instagram_embeds and uploads
 * @returns Transformed location response with nested objects
 */
export function transformLocationToResponse(location: LocationWithNested): LocationResponse {
  return {
    id: location.id!,
    title: location.title || null,
    category: location.category || 'attractions',
    locationKey: location.locationKey || null,
    contact: {
      countryCode: location.countryCode || null,
      phoneNumber: location.phoneNumber || null,
      website: location.website || null,
      contactAddress: location.contactAddress || null,
      url: location.url,
    },
    coordinates: {
      lat: location.lat || null,
      lng: location.lng || null,
    },
    source: {
      name: location.name,
      address: location.address,
    },
    instagram_embeds: location.instagram_embeds || [],
    uploads: location.uploads || [],
    created_at: location.created_at || new Date().toISOString(),
  };
}
