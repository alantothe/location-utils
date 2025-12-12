import { parse } from "csv-parse/sync";
import { readFile } from "node:fs/promises";
import type { RawLocation } from "../../features/locations/models/location";

export async function parseCsv(filePath: string): Promise<RawLocation[]> {
  const content = await readFile(filePath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records.map((record: any) => ({
    name: record.name,
    address: record.address,
  }));
}

export async function parseTxt(filePath: string): Promise<RawLocation[]> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");

  const locations: RawLocation[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.includes("|")) {
      const [name, address] = line.split("|").map((s) => s.trim());
      if (name && address) {
        locations.push({ name, address });
      }
    }
  }

  return locations;
}

export async function processLocationsFile(filePath: string): Promise<RawLocation[]> {
  if (filePath.endsWith(".csv")) {
    return parseCsv(filePath);
  }
  if (filePath.endsWith(".txt")) {
    return parseTxt(filePath);
  }
  throw new Error("Unsupported file format. Please use .csv or .txt");
}
