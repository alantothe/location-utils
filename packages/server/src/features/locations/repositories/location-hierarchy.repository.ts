import { getDb } from "@server/shared/db/client";
import type { LocationHierarchy, CountryData, CityData, NeighborhoodData } from "../models/location";
import {
  filterCitiesByCountry,
  filterNeighborhoodsByCity,
  getCountries as extractCountries,
  isLocationInScope,
  buildNestedHierarchy,
  formatLocationName
} from "../utils/location-utils";

function mapHierarchyRow(row: any): LocationHierarchy {
  return {
    id: row.id,
    country: row.country,
    city: row.city,
    neighborhood: row.neighborhood,
    locationKey: row.locationKey,
  };
}

/**
 * Get all location hierarchy entries (approved only)
 */
export function getAllLocationHierarchy(): LocationHierarchy[] {
  const db = getDb();
  const query = db.query(`
    SELECT id, country, city, neighborhood, locationKey
    FROM location_taxonomy
    WHERE status = 'approved'
    ORDER BY locationKey
  `);
  const rows = query.all() as any[];
  return rows.map(mapHierarchyRow);
}

/**
 * Get all countries (location entries where city and neighborhood are null)
 */
export function getCountries(): LocationHierarchy[] {
  const allLocations = getAllLocationHierarchy();
  return extractCountries(allLocations);
}

/**
 * Get all cities for a specific country
 */
export function getCitiesByCountry(country: string): LocationHierarchy[] {
  const allLocations = getAllLocationHierarchy();
  return filterCitiesByCountry(allLocations, country);
}

/**
 * Get all neighborhoods for a specific city
 */
export function getNeighborhoodsByCity(country: string, city: string): LocationHierarchy[] {
  const allLocations = getAllLocationHierarchy();
  return filterNeighborhoodsByCity(allLocations, country, city);
}

/**
 * Get locations that match or are children of a parent location key
 * Useful for filtering related content (e.g., attractions in a city)
 */
export function getLocationsInScope(parentLocationKey: string): LocationHierarchy[] {
  const allLocations = getAllLocationHierarchy();
  return allLocations.filter(loc => isLocationInScope(loc.locationKey, parentLocationKey));
}

/**
 * Get all countries with nested cities and neighborhoods
 * Returns the hierarchical structure expected by the API
 */
export function getCountriesNested(): CountryData[] {
  const allLocations = getAllLocationHierarchy();
  return buildNestedHierarchy(allLocations);
}

/**
 * Get cities for a country with nested neighborhoods
 */
export function getCitiesNestedByCountry(country: string): CityData[] {
  const allLocations = getAllLocationHierarchy();
  const countryData = buildNestedHierarchy(allLocations).find(c => c.code.toLowerCase() === country.toLowerCase() || c.label.toLowerCase() === country.toLowerCase());
  return countryData?.cities || [];
}

/**
 * Get neighborhoods for a specific country and city
 */
export function getNeighborhoodsNested(country: string, city: string): NeighborhoodData[] {
  const cities = getCitiesNestedByCountry(country);
  const cityData = cities.find(c => c.value === city);
  return cityData?.neighborhoods || [];
}

/**
 * Check if a locationKey exists in taxonomy (any status)
 */
export function taxonomyEntryExists(locationKey: string): boolean {
  const db = getDb();
  const query = db.query(`
    SELECT COUNT(*) as count
    FROM location_taxonomy
    WHERE locationKey = $locationKey
  `);
  const result = query.get({ $locationKey: locationKey }) as { count: number };
  return result.count > 0;
}

/**
 * Get a taxonomy entry by locationKey
 */
export function getTaxonomyEntry(locationKey: string): LocationHierarchy | null {
  const db = getDb();
  const query = db.query(`
    SELECT id, country, city, neighborhood, locationKey, status, created_at
    FROM location_taxonomy
    WHERE locationKey = $locationKey
  `);
  const row = query.get({ $locationKey: locationKey }) as any;
  if (!row) return null;
  return {
    ...mapHierarchyRow(row),
    status: row.status,
    created_at: row.created_at
  };
}

/**
 * Insert a new pending taxonomy entry
 * Returns the inserted entry or null if duplicate
 */
export function insertPendingTaxonomyEntry(
  country: string,
  city: string | null,
  neighborhood: string | null,
  locationKey: string
): LocationHierarchy | null {
  const db = getDb();

  try {
    const query = db.query(`
      INSERT INTO location_taxonomy (country, city, neighborhood, locationKey, status)
      VALUES ($country, $city, $neighborhood, $locationKey, 'pending')
    `);

    query.run({
      $country: country,
      $city: city,
      $neighborhood: neighborhood,
      $locationKey: locationKey
    });

    return getTaxonomyEntry(locationKey);
  } catch (error) {
    // UNIQUE constraint violation - entry already exists
    console.warn(`Taxonomy entry already exists: ${locationKey}`);
    return null;
  }
}

/**
 * Approve a taxonomy entry by locationKey
 */
export function approveTaxonomyEntry(locationKey: string): boolean {
  const db = getDb();
  try {
    const query = db.query(`
      UPDATE location_taxonomy
      SET status = 'approved'
      WHERE locationKey = $locationKey
    `);
    const result = query.run({ $locationKey: locationKey });
    return result.changes > 0;
  } catch (error) {
    console.error("Error approving taxonomy entry:", error);
    return false;
  }
}

/**
 * Reject (delete) a taxonomy entry by locationKey
 */
export function rejectTaxonomyEntry(locationKey: string): boolean {
  const db = getDb();
  try {
    const query = db.query(`
      DELETE FROM location_taxonomy
      WHERE locationKey = $locationKey AND status = 'pending'
    `);
    const result = query.run({ $locationKey: locationKey });
    return result.changes > 0;
  } catch (error) {
    console.error("Error rejecting taxonomy entry:", error);
    return false;
  }
}

/**
 * Get all pending taxonomy entries for admin review
 */
export function getPendingTaxonomyEntries(): LocationHierarchy[] {
  const db = getDb();
  const query = db.query(`
    SELECT id, country, city, neighborhood, locationKey, created_at
    FROM location_taxonomy
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `);
  const rows = query.all() as any[];
  return rows.map(row => ({
    ...mapHierarchyRow(row),
    status: 'pending' as const,
    created_at: row.created_at
  }));
}

/**
 * Get count of locations using a specific locationKey
 */
export function getLocationCountByTaxonomy(locationKey: string): number {
  const db = getDb();
  const query = db.query(`
    SELECT COUNT(*) as count
    FROM locations
    WHERE locationKey = $locationKey
  `);
  const result = query.get({ $locationKey: locationKey }) as { count: number };
  return result.count;
}
