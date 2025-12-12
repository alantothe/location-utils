import { parse } from 'csv-parse/sync';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function generateGoogleMapsUrl(name: string, address: string): string {
  const query = `${name} ${address}`;
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}

export interface RawLocation {
  name: string;
  address: string;
}

export async function parseCsv(filePath: string): Promise<RawLocation[]> {
  const content = await readFile(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  return records.map((record: any) => ({
    name: record.name,
    address: record.address
  }));
}

export async function parseTxt(filePath: string): Promise<RawLocation[]> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const locations: RawLocation[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Skip header if it looks like the example "Location Name | Full Address"
    if (line.includes('|')) {
      const [name, address] = line.split('|').map(s => s.trim());
      if (name && address) {
        locations.push({ name, address });
      }
    }
  }
  
  return locations;
}

export async function processLocationsFile(filePath: string): Promise<RawLocation[]> {
  if (filePath.endsWith('.csv')) {
    return parseCsv(filePath);
  } else if (filePath.endsWith('.txt')) {
    return parseTxt(filePath);
  } else {
    throw new Error('Unsupported file format. Please use .csv or .txt');
  }
}

export function extractInstagramData(html: string): { url: string | null, author: string | null } {
  // Extract URL from data-instgrm-permalink
  const permalinkMatch = html.match(/data-instgrm-permalink="([^"]+)"/);
  let url = permalinkMatch ? permalinkMatch[1] : null;

  // Clean URL query params if present (optional improvement, but cleaner for DB)
  if (url && url.includes('?')) {
    url = url.split('?')[0];
  }

  // Extract author from "A post shared by ..."
  const authorMatch = html.match(/A post shared by ([^<]+)/);
  const author = authorMatch ? authorMatch[1].trim() : null;

  return { url, author };
}

export function normalizeInstagram(author: string | null): string | null {
  if (!author) return null;
  // Remove common prefix like "A post shared by"
  let handle = author.replace(/A post shared by/ig, '').trim();
  // Take the first token (often the username)
  handle = handle.split(/\s+/)[0];
  // Strip leading @ and unsafe chars
  handle = handle.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '');
  if (!handle) return null;
  return `https://www.instagram.com/${handle}/`;
}

export async function getCoordinates(address: string, apiKey: string): Promise<{ lat: number, lng: number } | null> {
    if (!apiKey) {
        console.warn("Google Maps API Key is missing.");
        return null;
    }
    
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return {
                lat: location.lat,
                lng: location.lng
            };
        } else {
            console.warn(`Geocoding failed for "${address}": ${data.status} - ${data.error_message || ''}`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching coordinates:", error);
        return null;
    }
}
