import type { LocationCategory, Location, InstagramEmbed, Upload } from "../models/location";

export function generateGoogleMapsUrl(name: string, address: string): string {
  const query = `${name} ${address}`;
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

interface GeocodeResponse {
  status: string;
  results?: Array<{
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address?: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

type GeocodeResult = { lat: number; lng: number; countryCode?: string };

interface BigDataCloudResponse {
  latitude: number;
  longitude: number;
  localityLanguage: string;
  continent?: string;
  continentCode?: string;
  countryName?: string;
  countryCode?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  city?: string;
  locality?: string;
  postcode?: string;
  plusCode?: string;
}

type BigDataCloudLocationData = {
  countryName: string;
  countryCode: string;
  city: string;
  locality: string;
  locationKey: string;
};

function slugifyLocationPart(value: string | undefined): string | null {
  if (!value) return null;
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || null;
}

export async function geocode(address: string, apiKey?: string): Promise<GeocodeResult | null> {
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json() as GeocodeResponse;
    console.log("Geocode full response:", JSON.stringify(data, null, 2));

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      if (result && result.geometry && result.geometry.location) {
        const location = result.geometry.location;
        const countryComponent = result.address_components?.find((component) =>
          component.types?.includes("country")
        );

        return {
          lat: location.lat,
          lng: location.lng,
          countryCode: countryComponent?.short_name,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
}

interface PlaceDetailsResult {
  name?: string;
  formatted_address?: string;
  website?: string;
  international_phone_number?: string;
  formatted_phone_number?: string;
}

interface PlacesApiResponse {
  status: string;
  results?: Array<{
    place_id: string;
  }>;
  result?: PlaceDetailsResult;
}

export async function getPlaceDetails(name: string, address: string, apiKey?: string): Promise<PlaceDetailsResult | null> {
  if (!apiKey) return null;

  try {
    // Use Places API Text Search to find the place
    const query = `${name} ${address}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json() as PlacesApiResponse;
    console.log("Places Text Search full response:", JSON.stringify(searchData, null, 2));

    if (searchData.status === "OK" && searchData.results && searchData.results.length > 0) {
      const placeId = searchData.results[0]!.place_id;

      // Get detailed place information
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,website,international_phone_number,formatted_phone_number&key=${apiKey}`;

      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json() as PlacesApiResponse;
      console.log("Places Details full response:", JSON.stringify(detailsData, null, 2));

      if (detailsData.status === "OK" && detailsData.result) {
        return detailsData.result;
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
}

export async function reverseGeocodeWithBigDataCloud(
  latitude: number,
  longitude: number
): Promise<BigDataCloudLocationData | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const response = await fetch(url);
    const data = await response.json() as BigDataCloudResponse;

    // Extract and slugify location parts (country, city, locality/neighborhood)
    const locationParts = [
      slugifyLocationPart(data.countryName),
      slugifyLocationPart(data.city),
      slugifyLocationPart(data.locality),
    ].filter(Boolean) as string[];

    const locationKey = locationParts.length ? locationParts.join("|") : "";

    // Create filtered data object
    const filteredData = {
      countryName: data.countryName || "",
      countryCode: data.countryCode || "",
      city: data.city || "",
      locality: data.locality || "",
      locationKey
    };

    console.log("BigDataCloud Filtered Data:", filteredData);

    return filteredData;
  } catch (error) {
    console.error("Error fetching BigDataCloud reverse geocoding:", error);
    return null;
  }
}

export function extractInstagramData(html: string): { url: string | null; author: string | null } {
  const permalinkMatch = html.match(/data-instgrm-permalink="([^"]+)"/);
  let url = permalinkMatch ? permalinkMatch[1] : null;

  if (url && url.includes("?")) {
    url = url.split("?")[0];
  }

  const authorMatch = html.match(/A post shared by ([^<]+)/);
  let author: string | null = null;
  if (authorMatch && authorMatch[1] !== undefined) {
    const matched = authorMatch[1];
    if (typeof matched === 'string') {
      author = matched.trim();
    }
  }

  return { url, author } as { url: string | null; author: string | null };
}

export function normalizeInstagram(author: string | null): string | null {
  if (!author) return null;
  let handle = author.replace(/A post shared by/gi, "").trim();
  handle = handle.split(/\s+/)[0]!;
  handle = handle.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
  if (!handle) return null;
  return `https://www.instagram.com/${handle}/`;
}

export async function createFromMaps(
  name: string,
  address: string,
  apiKey?: string,
  category: LocationCategory = "attractions"
): Promise<Location> {
  const url = generateGoogleMapsUrl(name, address);
  const entry: Location = {
    name,
    title: name,
    address,
    url,
    lat: null,
    lng: null,
    category,
    locationKey: null,
  };

  if (!apiKey) {
    return entry;
  }

  try {
    // First, get coordinates via geocoding
    const coords = await geocode(address, apiKey);
    if (coords) {
      entry.lat = coords.lat;
      entry.lng = coords.lng;

      // Use Google countryCode
      if (coords.countryCode) {
        entry.countryCode = coords.countryCode;
      }

      // Use BigDataCloud ONLY for locationKey (no fallback)
      try {
        const bigDataCloudData = await reverseGeocodeWithBigDataCloud(coords.lat, coords.lng);
        if (bigDataCloudData && bigDataCloudData.locationKey) {
          entry.locationKey = bigDataCloudData.locationKey;
        }
      } catch (bigDataCloudError) {
        console.warn("Failed to fetch BigDataCloud reverse geocoding:", bigDataCloudError);
        // locationKey stays null if BigDataCloud fails
      }
    }

    // Try to get additional place details using Places API
    try {
      const placeDetails = await getPlaceDetails(name, address, apiKey);
      if (placeDetails) {
        // Update with enhanced information from Places API
        if (placeDetails.formatted_address) {
          // Prefer Google-provided address for contact details when available
          entry.contactAddress = placeDetails.formatted_address;
        }
        if (placeDetails.name && placeDetails.name !== name) {
          // The official name might be different
          entry.name = placeDetails.name;
          entry.title = placeDetails.name;
        }
        if (placeDetails.website) {
          entry.website = placeDetails.website;
        }
        if (placeDetails.international_phone_number) {
          entry.phoneNumber = placeDetails.international_phone_number;
        } else if (placeDetails.formatted_phone_number) {
          entry.phoneNumber = placeDetails.formatted_phone_number;
        }
      }
    } catch (placesError) {
      console.warn("Failed to fetch place details:", placesError);
      // Continue without place details - geocoding still worked
    }
  } catch (e) {
    console.warn("Failed to fetch coordinates in createFromMaps:", e);
  }

  return entry;
}

export function createFromInstagram(embedHtml: string, locationId: number): InstagramEmbed {
  const { author } = extractInstagramData(embedHtml);

  // Extract clean username from author
  let username = "Unknown";
  if (author) {
    // Extract the username from text like "Name (@username)" or "username"
    const usernameMatch = author.match(/@([a-zA-Z0-9._]+)/);
    if (usernameMatch && usernameMatch[1]) {
      username = `@${usernameMatch[1]}`;
    } else {
      // If no @ found, use first word and clean it
      const cleaned = author.trim().split(/\s+/)[0]!.replace(/[^a-zA-Z0-9._]/g, "");
      if (cleaned) {
        username = `@${cleaned}`;
      } else {
        console.warn("Failed to extract username from author text:", author);
      }
    }
  } else {
    console.warn("No author found in Instagram embed code. Username will default to 'Unknown'.");
  }

  return {
    location_id: locationId,
    username,
    url: extractInstagramData(embedHtml).url || "",
    embed_code: embedHtml,
    images: [],
    original_image_urls: [],
  };
}

export function createFromUpload(
  locationId: number,
  photographerCredit?: string | null
): Upload {
  return {
    location_id: locationId,
    photographerCredit: photographerCredit || null,
    images: [],
  };
}
