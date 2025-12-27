import type { Country } from "@client/shared/services/api/types";

/**
 * Convert country code to locationKey format (lowercase country name)
 * @param countryCode - Country code like "CO", "PE"
 * @param countries - Array of countries from API
 * @returns Lowercase country name like "colombia", "peru"
 */
export function countryCodeToLocationKey(
  countryCode: string,
  countries: Country[]
): string | null {
  const country = countries.find(c => c.code === countryCode);
  return country ? country.label.toLowerCase() : null;
}
