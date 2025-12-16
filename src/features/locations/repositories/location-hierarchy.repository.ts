import { getDb } from "../../../shared/db/client";
import type { LocationHierarchy } from "../models/location";
import {
  filterCitiesByCountry,
  filterNeighborhoodsByCity,
  getCountries as extractCountries,
  isLocationInScope
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
 * Get all location hierarchy entries
 */
export function getAllLocationHierarchy(): LocationHierarchy[] {
  const db = getDb();
  const query = db.query(`
    SELECT id, country, city, neighborhood, locationKey
    FROM location_taxonomy
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
