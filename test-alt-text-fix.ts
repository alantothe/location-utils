// Test script to verify alt text generation fix
import { AltTextApiClient } from './packages/server/src/shared/services/external/alt-text-api.client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testAltTextGeneration() {
  console.log('🧪 Testing alt text generation with content-type fix...\n');

  const client = new AltTextApiClient();

  // Test with different image formats
  const testImages = [
    { name: 'test-image.png', path: 'scripts/upload/img/60.png', format: 'png' },
    { name: 'test-image.jpg', path: 'scripts/upload/img/70.jpg', format: 'jpg' },
  ];

  for (const image of testImages) {
    try {
      console.log(`📸 Testing ${image.name} (${image.format})...`);

      const imagePath = join(process.cwd(), image.path);
      const imageBuffer = readFileSync(imagePath);

      console.log(`   📊 Image size: ${imageBuffer.length} bytes`);

      const altText = await client.generateAltText(imageBuffer, image.name, image.format);

      console.log(`   ✅ Success! Alt text: "${altText}"\n`);

    } catch (error) {
      console.log(`   ❌ Failed: ${error}\n`);
    }
  }

  console.log('🎉 Alt text generation test completed!');
}

// Run the test
testAltTextGeneration().catch(console.error);
