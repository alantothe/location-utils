#!/usr/bin/env bun

/**
 * Helper script to upload images to an existing location.
 *
 * Mirrors the Instagram helper but sends multipart/form-data to /api/add-upload,
 * and can optionally call /api/open-folder to reveal the saved images.
 *
 * Usage examples:
 *   bun run scripts/upload/add-upload.ts --location-id 1 --file scripts/upload/img/50.png
 *   bun run scripts/add-upload.ts --location-id 2 --file img1.jpg --file img2.png
 *   bun run scripts/add-upload.ts --location-id 3 --dir ./my-photos --open
 *   bun run scripts/add-upload.ts --location-id 4 --dir ./my-photos --api-url http://localhost:3000
 */

import { parseArgs } from "util";
import { readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

interface Args {
  "location-id"?: string;
  file?: string[];
  dir?: string;
  "api-url"?: string;
  open?: boolean;
  help?: boolean;
}

const HELP_TEXT = `
Upload Helper for /api/add-upload

Usage:
  bun run scripts/add-upload.ts --location-id <id> --file <path>
  bun run scripts/add-upload.ts --location-id <id> --file <path1> --file <path2>
  bun run scripts/add-upload.ts --location-id <id> --dir <folder> [--open]

Options:
  --location-id <id>   Required: ID of the parent location
  --file <path>        Repeatable: Path to an image file (JPEG, PNG, WebP, GIF)
  --dir <folder>       Optional: Upload all allowed images inside a folder (non-recursive)
  --api-url <url>      Optional: API base URL (default: http://localhost:3000)
  --open               Optional: After success, call /api/open-folder on the saved folder
  --help               Show this help message

Notes:
  - Limits enforced client-side to match the server: max 20 files, 10MB per file,
    and 50MB per request.
  - When using --dir, files are sorted alphabetically and filtered to allowed types.
`;

const ALLOWED_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;

function guessMimeType(filePath: string): string | undefined {
  const ext = extname(filePath).toLowerCase();
  return ALLOWED_TYPES[ext];
}

function collectFilePaths(files: string[] = [], dir?: string): string[] {
  const set = new Set<string>();
  for (const file of files) {
    set.add(file);
  }

  if (dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!ALLOWED_TYPES[ext]) continue;
      set.add(join(dir, entry.name));
    }
  }

  return Array.from(set).sort();
}

async function buildFileFormParts(filePaths: string[]) {
  let totalSize = 0;
  const files: File[] = [];

  for (const filePath of filePaths) {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    const mime = guessMimeType(filePath);
    if (!mime) {
      throw new Error(`Unsupported file type for ${filePath} (allowed: JPEG, PNG, WebP, GIF)`);
    }

    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File exceeds 10MB limit: ${filePath}`);
    }

    totalSize += stats.size;
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new Error("Total upload size exceeds 50MB limit.");
    }

    const buffer = await Bun.file(filePath).arrayBuffer();
    const file = new File([buffer], basename(filePath), { type: mime });
    files.push(file);
  }

  return { files, totalSize };
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "location-id": { type: "string" },
      file: { type: "string", multiple: true },
      dir: { type: "string" },
      "api-url": { type: "string" },
      open: { type: "boolean" },
      help: { type: "boolean" },
    },
  });

  const args = values as Args;

  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  const locationIdStr = args["location-id"];
  if (!locationIdStr) {
    console.error("Error: --location-id is required\n");
    console.log(HELP_TEXT);
    process.exit(1);
  }

  const locationId = Number.parseInt(locationIdStr, 10);
  if (Number.isNaN(locationId)) {
    console.error("Error: --location-id must be a valid number");
    process.exit(1);
  }

  const filePaths = collectFilePaths(args.file, args.dir);
  if (filePaths.length === 0) {
    console.error("Error: Provide at least one file via --file or a folder via --dir");
    process.exit(1);
  }

  if (filePaths.length > MAX_FILES) {
    console.error("Error: Maximum 20 files allowed per upload.");
    process.exit(1);
  }

  let files: File[];
  try {
    ({ files } = await buildFileFormParts(filePaths));
  } catch (error: any) {
    console.error(`Error preparing files: ${error?.message || error}`);
    process.exit(1);
  }

  const apiUrl = args["api-url"] || "http://localhost:3000";
  const endpoint = `${apiUrl}/api/add-upload`;
  console.log(`Uploading ${files.length} file(s) to location ${locationId}...`);
  console.log(`API endpoint: ${endpoint}`);

  const formData = new FormData();
  formData.set("locationId", locationId.toString());
  for (const file of files) {
    formData.append("files", file);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });
    const data = await response.json() as any;

    if (!response.ok) {
      console.error("\n❌ Error from API:");
      console.error(`   Status: ${response.status}`);
      console.error(`   Message: ${data.error || JSON.stringify(data)}`);
      process.exit(1);
    }

    const images: string[] = data.entry?.images || [];
    console.log("\n✅ Upload succeeded");
    console.log(`   Entry ID: ${data.entry?.id}`);
    console.log(`   Files saved: ${images.length}`);
    if (images.length > 0) {
      images.forEach((img: string) => console.log(`   - ${img}`));
    }

    if (args.open && images.length > 0 && images[0]) {
      const folderPath = dirname(images[0]);
      console.log(`\nOpening folder via /api/open-folder: ${folderPath}`);
      const openRes = await fetch(`${apiUrl}/api/open-folder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderPath }),
      });
      if (!openRes.ok) {
        console.warn(`⚠️  Failed to open folder (status ${openRes.status})`);
      } else {
        console.log("🗂️  Folder open request sent.");
      }
    }
  } catch (error: any) {
    console.error("\n❌ Request failed:");
    console.error(`   ${error?.message || error}`);
    process.exit(1);
  }
}

main();
