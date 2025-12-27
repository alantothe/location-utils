import type {
  LocationHierarchy,
  CountryData,
  CityData,
  NeighborhoodData,
  LocationWithNested,
  LocationResponse,
  Location,
  LocationBasic
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
    district: location.district || null,
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
    slug: location.slug || null,
    created_at: location.created_at || new Date().toISOString(),
  };
}

/**
 * Transform a location to basic response format with only essential info
 * @param location - Location object
 * @returns Basic location info with name and location
 */
export function transformLocationToBasicResponse(location: Location): LocationBasic {
  return {
    id: location.id!,
    name: location.name,
    location: location.locationKey || null,
    category: location.category || 'attractions',
  };
}

/**
 * Transform flat location hierarchy rows into nested country data structure
 * @param locations - Flat array of location hierarchy entries
 * @returns Array of countries with nested cities and neighborhoods
 */
export function buildNestedHierarchy(locations: LocationHierarchy[]): CountryData[] {
  const countryMap = new Map<string, CountryData>();

  locations.forEach(loc => {
    // Get or create country
    if (!countryMap.has(loc.country)) {
      countryMap.set(loc.country, {
        code: loc.country.toUpperCase().slice(0, 2), // CO, PE, etc.
        label: formatLocationName(loc.country), // Colombia, Peru
        cities: []
      });
    }

    const country = countryMap.get(loc.country)!;

    // If this is a city entry (has city but no neighborhood)
    if (loc.city && !loc.neighborhood) {
      // Check if city already exists
      let city = country.cities.find(c => c.value === loc.city);
      if (!city) {
        city = {
          label: formatLocationName(loc.city),
          value: loc.city,
          neighborhoods: []
        };
        country.cities.push(city);
      }
    }

    // If this is a neighborhood entry (has both city and neighborhood)
    if (loc.city && loc.neighborhood) {
      // Get or create city
      let city = country.cities.find(c => c.value === loc.city);
      if (!city) {
        city = {
          label: formatLocationName(loc.city),
          value: loc.city,
          neighborhoods: []
        };
        country.cities.push(city);
      }

      // Add neighborhood if not already present
      const neighborhoodExists = city.neighborhoods.some(n => n.value === loc.neighborhood);
      if (!neighborhoodExists) {
        city.neighborhoods.push({
          label: formatLocationName(loc.neighborhood),
          value: loc.neighborhood
        });
      }
    }
  });

  return Array.from(countryMap.values());
}
