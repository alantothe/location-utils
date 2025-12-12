import prompts from 'prompts';
import { join } from 'node:path';
import { readdir, writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { saveLocation, getAllLocations, clearDatabase, getLocationById, type LocationEntry } from './db';
import { generateGoogleMapsUrl, processLocationsFile, extractInstagramData, normalizeInstagram, type RawLocation } from './utils';
import { createFromMaps, createFromInstagram } from './location';
import { startServer } from './server';

async function main() {
  console.log("🌍 URL Manager CLI");
  console.log("--------------------------------");

  const response = await prompts({
    type: 'select',
    name: 'mode',
    message: 'Select Mode (use arrow keys or type number):',
    choices: [
      { title: '1. Single Location', value: 'single' },
      { title: '2. Batch Mode (from file)', value: 'batch' },
      { title: '3. Extract from Instagram Embed', value: 'instagram' },
      { title: '4. View Database History', value: 'history' },
      { title: '5. Start Web Interface', value: 'web' },
      { title: '6. Kill / Clear All Data', value: 'kill' },
      { title: '7. Exit', value: 'exit' }
    ],
    hint: 'Press number key (1-7) or use arrows'
  });

  if (response.mode === 'single') {
    await handleSingleMode();
  } else if (response.mode === 'batch') {
    await handleBatchMode();
  } else if (response.mode === 'instagram') {
    await handleInstagramMode();
  } else if (response.mode === 'history') {
    await handleViewHistory();
  } else if (response.mode === 'web') {
    startServer();
    // Keep process alive for server
  } else if (response.mode === 'kill') {
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

  // Filter main locations (not Instagram embeds)
  const mainLocations = locations.filter(l => l.type === 'maps' || !l.parent_id);

  console.log(`\n📜 Found ${mainLocations.length} main locations in database:\n`);

  mainLocations.forEach(loc => {
    // Get Instagram embeds and uploads for this location
    const instagramEmbeds = locations.filter(e => e.parent_id === loc.id && e.type === 'instagram');
    const uploadEntries = locations.filter(e => e.parent_id === loc.id && e.type === 'upload');

    console.log(`\n📍 ${loc.name}`);
    console.log(`   Category: ${loc.category || 'attractions'}`);
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
      type: 'text',
      name: 'name',
      message: 'Enter Location Name:',
      validate: value => value.length > 0 ? true : 'Name is required'
    },
    {
      type: 'text',
      name: 'address',
      message: 'Enter Full Address:',
      validate: value => value.length > 0 ? true : 'Address is required'
    },
    {
      type: 'select',
      name: 'category',
      message: 'Select Category (use arrow keys or type number):',
      choices: [
        { title: '1. 🎯 Attractions', value: 'attractions' },
        { title: '2. 🍽️  Dining', value: 'dining' },
        { title: '3. 🏨 Accommodations', value: 'accommodations' },
        { title: '4. 🎉 Nightlife', value: 'nightlife' }
      ],
      initial: 0,
      hint: 'Press number key (1-4) or use arrows'
    }
  ]);

  if (!input.name || !input.address) return;

  // Create unified Location entry (may fetch coords if you provide API key via env)
  const entry = await createFromMaps(input.name, input.address, process.env.GOOGLE_MAPS_API_KEY, input.category);

  // Save to DB
  saveLocation(entry);

  // Output JSON
  const output = { [input.name]: url };
  console.log("\n✅ Generated URL:");
  console.log(JSON.stringify(output, null, 2));

  // Optional Save
  const save = await prompts({
    type: 'confirm',
    name: 'value',
    message: 'Save to output.json?',
    initial: true
  });

  if (save.value) {
    await updateJsonFile('output.json', output);
    console.log(`Saved to ${process.cwd()}/output.json`);
  }
}

async function handleBatchMode() {
  const folderInput = await prompts({
    type: 'text',
    name: 'path',
    message: 'Enter folder path containing locations file:',
    initial: process.cwd()
  });

  const folderPath = folderInput.path;

  try {
    if (!existsSync(folderPath)) {
      console.error("❌ Folder does not exist.");
      return;
    }

    const files = await readdir(folderPath);
    const locationFiles = files.filter(f => f.endsWith('.csv') || f.endsWith('.txt'));

    if (locationFiles.length === 0) {
      console.error("❌ No .csv or .txt files found in the folder.");
      return;
    }

    const fileSelection = await prompts({
      type: 'select',
      name: 'filename',
      message: 'Select a file to process (use arrow keys or type number):',
      choices: locationFiles.map((f, idx) => ({ title: `${idx + 1}. ${f}`, value: f })),
      hint: 'Press number key or use arrows'
    });

    if (!fileSelection.filename) return;

    const fullPath = join(folderPath, fileSelection.filename);
    console.log(`Processing ${fullPath}...`);

    const rawLocations = await processLocationsFile(fullPath);

    // Ask for category for the entire batch
    const categorySelection = await prompts({
      type: 'select',
      name: 'category',
      message: 'Select category for all locations in this batch (use arrow keys or type number):',
      choices: [
        { title: '1. 🎯 Attractions', value: 'attractions' },
        { title: '2. 🍽️  Dining', value: 'dining' },
        { title: '3. 🏨 Accommodations', value: 'accommodations' },
        { title: '4. 🎉 Nightlife', value: 'nightlife' }
      ],
      initial: 0,
      hint: 'All locations will be assigned this category'
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

    // Save to JSON in the same folder
    const outputFileName = 'location_urls.json';
    const outputPath = join(folderPath, outputFileName);
    
    await updateJsonFile(outputPath, newEntries);
    console.log(`Saved/Updated: ${outputPath}`);

  } catch (error) {
    console.error("Error processing batch:", error);
  }
}

async function handleInstagramMode() {
  // First, get all main locations to choose from
  const allLocations = getAllLocations();
  const mainLocations = allLocations.filter(l => l.type === 'maps' || !l.parent_id);

  if (mainLocations.length === 0) {
    console.log("\n❌ No locations found. Please create a location first before adding Instagram embeds.");
    return;
  }

  // Let user select a location
  const locationResponse = await prompts({
    type: 'select',
    name: 'locationId',
    message: 'Select a location to add Instagram embed to (use arrow keys or type number):',
    choices: mainLocations.map((l, idx) => ({
      title: `${idx + 1}. ${l.name} (${l.address})`,
      value: l.id
    })),
    hint: 'Press number key or use arrows'
  });

  if (!locationResponse.locationId) return;

  const selectedLocation = getLocationById(locationResponse.locationId);
  if (!selectedLocation) {
    console.error("❌ Selected location not found.");
    return;
  }

  const methodResponse = await prompts({
    type: 'select',
    name: 'method',
    message: 'Select Input Method (use arrow keys or type number):',
    choices: [
      { title: '1. Paste Code', value: 'paste' },
      { title: '2. Read from File', value: 'file' }
    ],
    hint: 'Press 1 or 2, or use arrows'
  });

  let htmlContent = '';

  if (methodResponse.method === 'paste') {
    const pasteResponse = await prompts({
      type: 'text',
      name: 'html',
      message: 'Paste Instagram Embed Code:',
    });
    htmlContent = pasteResponse.html;
  } else if (methodResponse.method === 'file') {
     const fileResponse = await prompts({
      type: 'text',
      name: 'path',
      message: 'Enter file path containing embed code:',
      initial: process.cwd()
    });
    if (existsSync(fileResponse.path)) {
      htmlContent = await readFile(fileResponse.path, 'utf-8');
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

  const { url, author } = extractInstagramData(htmlContent);

  if (!url) {
    console.error("❌ Could not extract Instagram URL from the provided code.");
    return;
  }

  // Create Instagram entry linked to the selected location
  const entry = createFromInstagram(htmlContent, selectedLocation.id);

  saveLocation(entry);
  console.log(`\n✅ Saved Instagram embed to location: ${selectedLocation.name}`);
  console.log(`🔗 URL: ${url}`);

  try {
    console.log('\n🔄 Fetching data from RapidAPI...');
    const apiResponse = await fetch('https://instagram120.p.rapidapi.com/api/instagram/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'instagram120.p.rapidapi.com',
        'x-rapidapi-key': '3e4f70dd00mshb714e256435f6e3p15c503jsn0c5a2df22416'
      },
      body: JSON.stringify({ url: url })
    });
    
    const data = await apiResponse.json();
    // console.log('✅ RapidAPI Response:', data);

    const imageUrls: string[] = [];

    // Helper to find URL in candidates
    const getBestUrl = (candidates: any[]) => {
       if (!candidates || candidates.length === 0) return null;
       // Usually the first one is the best quality, or we can look for specific dimensions
       return candidates[0].url;
    };

    if (data.media) {
        // Case 1: Carousel (multiple images)
        if (data.media.carousel_media) {
             data.media.carousel_media.forEach((item: any) => {
                 if (item.image_versions2 && item.image_versions2.candidates) {
                     const url = getBestUrl(item.image_versions2.candidates);
                     if (url) imageUrls.push(url);
                 }
             });
        } 
        // Case 2: Single Image
        else if (data.media.image_versions2 && data.media.image_versions2.candidates) {
             const url = getBestUrl(data.media.image_versions2.candidates);
             if (url) imageUrls.push(url);
        }
    }

    // Fallback: Check if there is a flat list of objects with pictureUrl (based on user prompt hint)
    // or if the response structure is different than expected standard Instagram API.
    // Some RapidAPI endpoints return a simplified array.
    if (imageUrls.length === 0 && Array.isArray(data)) {
        data.forEach((item: any) => {
            if (item.pictureUrl) imageUrls.push(item.pictureUrl);
        });
    } else if (imageUrls.length === 0 && data.pictureUrl) {
         imageUrls.push(data.pictureUrl);
    }

    if (imageUrls.length > 0) {
        console.log('\n📸 Extracted Image URLs:');
        console.log(imageUrls);

        console.log('\n⬇️ Downloading images...');

        // Create nested folder structure for this location
        const cleanName = selectedLocation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
        const timestamp = Date.now();

        // Build nested path: images/{cleanName}/instagram/{timestamp}/
        const baseImagesDir = join(process.cwd(), 'images');
        const locationDir = join(baseImagesDir, cleanName);
        const typeDir = join(locationDir, 'instagram');
        const timestampDir = join(typeDir, timestamp.toString());

        // Create nested directories
        if (!existsSync(baseImagesDir)) await mkdir(baseImagesDir);
        if (!existsSync(locationDir)) await mkdir(locationDir);
        if (!existsSync(typeDir)) await mkdir(typeDir);
        if (!existsSync(timestampDir)) await mkdir(timestampDir);

        const locationDirPath = timestampDir;

        const savedPaths: string[] = [];

        for (let i = 0; i < imageUrls.length; i++) {
            const imgUrl = imageUrls[i];
            try {
                const imgRes = await fetch(imgUrl);
                if (!imgRes.ok) throw new Error(`Failed to fetch ${imgUrl}`);

                const filename = `image_${i}.jpg`;
                const filePath = join(locationDirPath, filename);

                // Write file using Bun
                await Bun.write(filePath, await imgRes.blob());

                // Store relative path with nested structure
                savedPaths.push(`images/${cleanName}/instagram/${timestamp}/${filename}`);
                console.log(`Saved: images/${cleanName}/instagram/${timestamp}/${filename}`);
            } catch (err) {
                console.error(`Error downloading image ${i + 1}:`, err);
            }
        }

        if (savedPaths.length > 0) {
            // Update the entry with image paths and original URLs
            entry.images = savedPaths;
            entry.original_image_urls = imageUrls;
            saveLocation(entry);
            console.log('✅ Database updated with local image paths.');
        }

    } else {
        console.log('⚠️ No image URLs found in the response.');
        console.log('Full Response for debugging:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error fetching from RapidAPI:', error);
  }
}

async function handleKillMode() {
  const confirm = await prompts({
    type: 'confirm',
    name: 'value',
    message: '⚠️  Are you sure you want to DELETE ALL locations from the database? This cannot be undone.',
    initial: false
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
      const content = await readFile(filePath, 'utf-8');
      existingData = JSON.parse(content);
    } catch (e) {
      console.warn("Could not parse existing JSON file, starting fresh.");
    }
  }

  const mergedData = { ...existingData, ...newData };
  await writeFile(filePath, JSON.stringify(mergedData, null, 2));
}

// Run
main().catch(console.error);
