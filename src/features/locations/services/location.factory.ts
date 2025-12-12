import type { LocationCategory, LocationEntry } from "../models/location";

export function generateGoogleMapsUrl(name: string, address: string): string {
  const query = `${name} ${address}`;
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

export async function geocode(address: string, apiKey?: string): Promise<{ lat: number; lng: number } | null> {
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
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
  const author = authorMatch ? authorMatch[1].trim() : null;

  return { url, author };
}

export function normalizeInstagram(author: string | null): string | null {
  if (!author) return null;
  let handle = author.replace(/A post shared by/gi, "").trim();
  handle = handle.split(/\s+/)[0];
  handle = handle.replace(/^@/, "").replace(/[^a-zA-Z0-9._]/g, "");
  if (!handle) return null;
  return `https://www.instagram.com/${handle}/`;
}

export async function createFromMaps(
  name: string,
  address: string,
  apiKey?: string,
  category: LocationCategory = "attractions"
): Promise<LocationEntry> {
  const url = generateGoogleMapsUrl(name, address);
  const entry: LocationEntry = {
    name,
    address,
    url,
    embed_code: undefined,
    instagram: undefined,
    images: [],
    original_image_urls: [],
    lat: null,
    lng: null,
    parent_id: null,
    type: "maps",
    category,
  };

  try {
    const coords = await geocode(address, apiKey);
    if (coords) {
      entry.lat = coords.lat;
      entry.lng = coords.lng;
    }
  } catch (e) {
    console.warn("Failed to fetch coordinates in createFromMaps:", e);
  }

  return entry;
}

export function createFromInstagram(embedHtml: string, parentLocationId?: number): LocationEntry {
  const { author } = extractInstagramData(embedHtml);
  const name = author ? `${author}_${Date.now()}` : `Instagram_${Date.now()}`;
  const instaProfile = normalizeInstagram(author);

  return {
    name,
    address: "Instagram Embed",
    url: extractInstagramData(embedHtml).url || "",
    embed_code: embedHtml,
    instagram: instaProfile || undefined,
    images: [],
    original_image_urls: [],
    lat: null,
    lng: null,
    parent_id: parentLocationId || null,
    type: "instagram",
  };
}

export function createFromUpload(parentLocationId: number, timestamp?: number): LocationEntry {
  const ts = timestamp || Date.now();
  const name = `Upload ${ts}`;

  return {
    name,
    address: "Direct Upload",
    url: "",
    embed_code: undefined,
    instagram: undefined,
    images: [],
    original_image_urls: [],
    lat: null,
    lng: null,
    parent_id: parentLocationId,
    type: "upload",
  };
}
