import prompts from "prompts";
import { join } from "node:path";
import { readdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { saveLocation, getAllLocations, clearDatabase, getLocationById } from "./features/locations/repositories/location.repository";
import { processLocationsFile } from "./shared/utils/file";
import { createFromMaps, createFromInstagram, extractInstagramData } from "./features/locations/services/location.factory";
import { startServer } from "./main";
import { initDb } from "./shared/db/client";

async function main() {
  initDb();
  console.log("🌍 URL Manager CLI");
  console.log("--------------------------------");

  const response = await prompts({
    type: "select",
    name: "mode",
    message: "Select Mode (use arrow keys or type number):",
    choices: [
      { title: "1. Single Location", value: "single" },
      { title: "2. Batch Mode (from file)", value: "batch" },
      { title: "3. Extract from Instagram Embed", value: "instagram" },
      { title: "4. View Database History", value: "history" },
      { title: "5. Start Web Interface", value: "web" },
      { title: "6. Kill / Clear All Data", value: "kill" },
      { title: "7. Exit", value: "exit" },
    ],
    hint: "Press number key (1-7) or use arrows",
  });

  if (response.mode === "single") {
    await handleSingleMode();
  } else if (response.mode === "batch") {
    await handleBatchMode();
  } else if (response.mode === "instagram") {
    await handleInstagramMode();
  } else if (response.mode === "history") {
    await handleViewHistory();
  } else if (response.mode === "web") {
    startServer();
  } else if (response.mode === "kill") {
    await handleKillMode();
  } else {
    console.log("Goodbye!");
    process.exit(0);
  }
}

async function handleViewHistory() {
  const locations = getAllLocations();

  if (locations.length === 0) {
    console.log("\n📭 Database is empty.");
    return;
  }

  const mainLocations = locations.filter((l) => l.type === "maps" || !l.parent_id);

  console.log(`\n📜 Found ${mainLocations.length} main locations in database:\n`);

  mainLocations.forEach((loc) => {
    const instagramEmbeds = locations.filter((e) => e.parent_id === loc.id && e.type === "instagram");
    const uploadEntries = locations.filter((e) => e.parent_id === loc.id && e.type === "upload");

    console.log(`\n📍 ${loc.name}`);
    console.log(`   Category: ${loc.category || "attractions"}`);
    console.log(`   Address: ${loc.address}`);
    console.log(`   URL: ${loc.url}`);
    if (loc.lat && loc.lng) {
      console.log(`   Coordinates: ${loc.lat}, ${loc.lng}`);
    }
    if (instagramEmbeds.length > 0) {
      console.log(`   📸 Instagram Embeds: ${instagramEmbeds.length}`);
      instagramEmbeds.forEach((embed, idx) => {
        console.log(`     ${idx + 1}. ${embed.name} (${embed.images?.length || 0} images)`);
      });
    }
    if (uploadEntries.length > 0) {
      console.log(`   ☁️  Uploads: ${uploadEntries.length}`);
      uploadEntries.forEach((upload, idx) => {
        console.log(`     ${idx + 1}. ${upload.name} (${upload.images?.length || 0} images)`);
      });
    }
  });
}

async function handleSingleMode() {
  const input = await prompts([
    {
      type: "text",
      name: "name",
      message: "Enter Location Name:",
      validate: (value) => (value.length > 0 ? true : "Name is required"),
    },
    {
      type: "text",
      name: "address",
      message: "Enter Full Address:",
      validate: (value) => (value.length > 0 ? true : "Address is required"),
    },
    {
      type: "select",
      name: "category",
      message: "Select Category (use arrow keys or type number):",
      choices: [
        { title: "1. 🎯 Attractions", value: "attractions" },
        { title: "2. 🍽️  Dining", value: "dining" },
        { title: "3. 🏨 Accommodations", value: "accommodations" },
        { title: "4. 🎉 Nightlife", value: "nightlife" },
      ],
      initial: 0,
      hint: "Press number key (1-4) or use arrows",
    },
  ]);

  if (!input.name || !input.address) return;

  const entry = await createFromMaps(input.name, input.address, process.env.GOOGLE_MAPS_API_KEY, input.category);
  saveLocation(entry);

  const output = { [input.name]: entry.url };
  console.log("\n✅ Generated URL:");
  console.log(JSON.stringify(output, null, 2));

  const save = await prompts({
    type: "confirm",
    name: "value",
    message: "Save to output.json?",
    initial: true,
  });

  if (save.value) {
    await updateJsonFile("output.json", output);
    console.log(`Saved to ${process.cwd()}/output.json`);
  }
}

async function handleBatchMode() {
  const folderInput = await prompts({
    type: "text",
    name: "path",
    message: "Enter folder path containing locations file:",
    initial: process.cwd(),
  });

  const folderPath = folderInput.path;

  try {
    if (!existsSync(folderPath)) {
      console.error("❌ Folder does not exist.");
      return;
    }

    const files = await readdir(folderPath);
    const locationFiles = files.filter((f) => f.endsWith(".csv") || f.endsWith(".txt"));

    if (locationFiles.length === 0) {
      console.error("❌ No .csv or .txt files found in the folder.");
      return;
    }

    const fileSelection = await prompts({
      type: "select",
      name: "filename",
      message: "Select a file to process (use arrow keys or type number):",
      choices: locationFiles.map((f, idx) => ({ title: `${idx + 1}. ${f}`, value: f })),
      hint: "Press number key or use arrows",
    });

    if (!fileSelection.filename) return;

    const fullPath = join(folderPath, fileSelection.filename);
    console.log(`Processing ${fullPath}...`);

    const rawLocations = await processLocationsFile(fullPath);

    const categorySelection = await prompts({
      type: "select",
      name: "category",
      message: "Select category for all locations in this batch (use arrow keys or type number):",
      choices: [
        { title: "1. 🎯 Attractions", value: "attractions" },
        { title: "2. 🍽️  Dining", value: "dining" },
        { title: "3. 🏨 Accommodations", value: "accommodations" },
        { title: "4. 🎉 Nightlife", value: "nightlife" },
      ],
      initial: 0,
      hint: "All locations will be assigned this category",
    });

    if (!categorySelection.category) return;

    const newEntries: Record<string, string> = {};
    let processedCount = 0;

    for (const loc of rawLocations) {
      const entry = await createFromMaps(loc.name, loc.address, process.env.GOOGLE_MAPS_API_KEY, categorySelection.category);
      saveLocation(entry);
      newEntries[loc.name] = entry.url;
      processedCount++;
    }

    console.log(`\n✅ Processed ${processedCount} locations.`);
    console.log(JSON.stringify(newEntries, null, 2));

    const outputFileName = "location_urls.json";
    const outputPath = join(folderPath, outputFileName);

    await updateJsonFile(outputPath, newEntries);
    console.log(`Saved/Updated: ${outputPath}`);
  } catch (error) {
    console.error("Error processing batch:", error);
  }
}

async function handleInstagramMode() {
  const allLocations = getAllLocations();
  const mainLocations = allLocations.filter((l) => l.type === "maps" || !l.parent_id);

  if (mainLocations.length === 0) {
    console.log("\n❌ No locations found. Please create a location first before adding Instagram embeds.");
    return;
  }

  const locationResponse = await prompts({
    type: "select",
    name: "locationId",
    message: "Select a location to add Instagram embed to (use arrow keys or type number):",
    choices: mainLocations.map((l, idx) => ({
      title: `${idx + 1}. ${l.name} (${l.address})`,
      value: l.id,
    })),
    hint: "Press number key or use arrows",
  });

  if (!locationResponse.locationId) return;

  const selectedLocation = getLocationById(locationResponse.locationId);
  if (!selectedLocation) {
    console.error("❌ Selected location not found.");
    return;
  }

  const methodResponse = await prompts({
    type: "select",
    name: "method",
    message: "Select Input Method (use arrow keys or type number):",
    choices: [
      { title: "1. Paste Code", value: "paste" },
      { title: "2. Read from File", value: "file" },
    ],
    hint: "Press 1 or 2, or use arrows",
  });

  let htmlContent = "";

  if (methodResponse.method === "paste") {
    const pasteResponse = await prompts({
      type: "text",
      name: "html",
      message: "Paste Instagram Embed Code:",
    });
    htmlContent = pasteResponse.html;
  } else if (methodResponse.method === "file") {
    const fileResponse = await prompts({
      type: "text",
      name: "path",
      message: "Enter file path containing embed code:",
      initial: process.cwd(),
    });
    if (existsSync(fileResponse.path)) {
      htmlContent = await readFile(fileResponse.path, "utf-8");
    } else {
      console.error("❌ File does not exist.");
      return;
    }
  } else {
    return;
  }

  if (!htmlContent) {
    console.error("❌ No content provided.");
    return;
  }

  const { url } = extractInstagramData(htmlContent);

  if (!url) {
    console.error("❌ Could not extract Instagram URL from the provided code.");
    return;
  }

  const entry = createFromInstagram(htmlContent, selectedLocation.id);

  saveLocation(entry);
  console.log(`\n✅ Saved Instagram embed to location: ${selectedLocation.name}`);
  console.log(`🔗 URL: ${url}`);
}

async function handleKillMode() {
  const confirm = await prompts({
    type: "confirm",
    name: "value",
    message:
      "⚠️  Are you sure you want to DELETE ALL locations from the database? This cannot be undone.",
    initial: false,
  });

  if (confirm.value) {
    const success = clearDatabase();
    if (success) {
      console.log("\n💥 Database cleared successfully. All records have been deleted.");
    } else {
      console.error("\n❌ Failed to clear database.");
    }
  } else {
    console.log("\nOperation cancelled.");
  }
}

async function updateJsonFile(filePath: string, newData: Record<string, string>) {
  let existingData: Record<string, string> = {};

  if (existsSync(filePath)) {
    try {
      const content = await readFile(filePath, "utf-8");
      existingData = JSON.parse(content);
    } catch (e) {
      console.warn("Could not parse existing JSON file, starting fresh.");
    }
  }

  const mergedData = { ...existingData, ...newData };
  await writeFile(filePath, JSON.stringify(mergedData, null, 2));
}

main().catch(console.error);
