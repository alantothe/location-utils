#!/usr/bin/env bun

/**
 * Helper script to add Instagram embeds to locations
 *
 * This script handles JSON escaping automatically, making it easier
 * to submit Instagram embed codes without manual quote escaping.
 *
 * Usage:
 *   bun run scripts/instagram/add-instagram-embed.ts --location-id 1 --embed-file scripts/instagram/embed.html
 *   bun run scripts/add-instagram-embed.ts --location-id 1 < embed.html
 *   cat embed.html | bun run scripts/add-instagram-embed.ts --location-id 1
 *   bun run scripts/add-instagram-embed.ts   # prompts for ID + paste embed, then Ctrl+D
 */

import { parseArgs } from "util";
import { readFileSync } from "fs";
import { createInterface } from "node:readline/promises";
import { stdin as nodeStdin, stdout as nodeStdout } from "node:process";

interface Args {
  "location-id"?: string;
  "embed-file"?: string;
  "api-url"?: string;
  help?: boolean;
}

const HELP_TEXT = `
Instagram Embed Submission Helper

Usage:
  bun run scripts/add-instagram-embed.ts --location-id <id> --embed-file <file>
  bun run scripts/add-instagram-embed.ts --location-id <id> < embed.html
  cat embed.html | bun run scripts/add-instagram-embed.ts --location-id <id>
  bun run scripts/add-instagram-embed.ts   # interactive prompts

Options:
  --location-id <id>      Required: ID of the parent location
  --embed-file <file>     Optional: Path to file containing embed code (defaults to stdin)
  --api-url <url>         Optional: API URL (defaults to http://localhost:3000)
  --help                  Show this help message

Examples:
  # Read from file
  bun run scripts/add-instagram-embed.ts --location-id 1 --embed-file my-embed.html

  # Read from stdin
  cat embed.html | bun run scripts/add-instagram-embed.ts --location-id 1

  # Use custom API URL
  bun run scripts/add-instagram-embed.ts --location-id 1 --embed-file embed.html --api-url http://production:3000
`;

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: nodeStdin, output: nodeStdout });
  const answer = await rl.question(question);
  await rl.close();
  return answer.trim();
}

async function readFromStdin(): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = "";
    nodeStdin.setEncoding("utf-8");
    nodeStdin.on("data", (chunk) => {
      data += chunk;
    });
    nodeStdin.on("end", () => resolve(data));
    nodeStdin.on("error", reject);
    nodeStdin.resume();
  });
}

async function main() {
  // Parse command line arguments
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "location-id": { type: "string" },
      "embed-file": { type: "string" },
      "api-url": { type: "string" },
      help: { type: "boolean" },
    },
  });

  const args = values as Args;

  // Show help if requested
  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Validate location ID
  let locationIdStr = args["location-id"];
  if (!locationIdStr && process.stdin.isTTY) {
    locationIdStr = await prompt("Location ID: ");
  }
  if (!locationIdStr) {
    console.error("Error: --location-id is required");
    console.log(HELP_TEXT);
    process.exit(1);
  }

  const locationId = parseInt(locationIdStr, 10);
  if (isNaN(locationId)) {
    console.error("Error: --location-id must be a valid number");
    process.exit(1);
  }

  // Read embed code from file or stdin
  let embedCode: string;
  if (args["embed-file"]) {
    try {
      embedCode = readFileSync(args["embed-file"], "utf-8");
    } catch (error) {
      console.error(`Error reading file: ${error}`);
      process.exit(1);
    }
  } else {
    // Read from stdin
    if (process.stdin.isTTY) {
      console.log("\nPaste the Instagram embed code, then press Ctrl+D to submit:\n");
    }
    try {
      embedCode = await readFromStdin();
      if (!embedCode || embedCode.trim().length === 0) {
        console.error("Error: No embed code provided via stdin");
        console.log("\nTip: Pipe the embed code to this script:");
        console.log("  cat embed.html | bun run scripts/add-instagram-embed.ts --location-id 1");
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error reading stdin: ${error}`);
      process.exit(1);
    }
  }

  embedCode = embedCode.trim();

  // Validate embed code is not empty
  if (!embedCode) {
    console.error("Error: Embed code is empty");
    process.exit(1);
  }

  // Prepare API request
  const apiUrl = args["api-url"] || "http://localhost:3000";
  const endpoint = `${apiUrl}/api/add-instagram`;

  const requestBody = {
    locationId,
    embedCode,
  };

  console.log(`Submitting Instagram embed to location ${locationId}...`);
  console.log(`API endpoint: ${endpoint}`);
  console.log(`Embed code length: ${embedCode.length} characters`);

  // Check if embed contains "A post shared by" for early validation
  if (!embedCode.includes("A post shared by")) {
    console.warn("\n⚠️  Warning: Embed code doesn't contain 'A post shared by'");
    console.warn("   This may cause username extraction to fail.");
    console.warn("   Please ensure you copied the complete Instagram embed code.\n");
  }

  // Submit to API
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("\n❌ Error from API:");
      console.error(`   Status: ${response.status}`);
      console.error(`   Message: ${data.error || JSON.stringify(data)}`);
      process.exit(1);
    }

    console.log("\n✅ Success! Instagram embed added:");
    console.log(`   ID: ${data.entry.id}`);
    console.log(`   Username: ${data.entry.username}`);
    console.log(`   URL: ${data.entry.url}`);
    console.log(`   Images downloaded: ${data.entry.images?.length || 0}`);

  } catch (error) {
    console.error("\n❌ Request failed:");
    console.error(`   ${error}`);
    process.exit(1);
  }
}

main();
