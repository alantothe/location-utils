#!/usr/bin/env bun

/**
 * Manual test: End-to-end taxonomy approval workflow
 *
 * This script tests the complete workflow:
 * 1. Create location with new neighborhood
 * 2. Check pending taxonomy entries
 * 3. Approve taxonomy entry
 * 4. Verify it appears in country filters
 */

const BASE_URL = "http://localhost:3000";

async function testTaxonomyWorkflow() {
  console.log("🧪 Testing Taxonomy Approval Workflow\n");

  try {
    // 1. Create location with new neighborhood
    console.log("1️⃣ Creating location with new neighborhood...");
    const createResponse = await fetch(`${BASE_URL}/api/add-maps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Restaurant Surquillo",
        address: "123 Test St, Surquillo, Lima, Peru",
        category: "dining"
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create location: ${createResponse.statusText}`);
    }

    const location = await createResponse.json();
    console.log("   ✅ Location created:");
    console.log(`      - Name: ${location.data.entry.title || location.data.entry.source.name}`);
    console.log(`      - LocationKey: ${location.data.entry.locationKey || 'null'}`);

    // 2. Check pending taxonomy
    console.log("\n2️⃣ Fetching pending taxonomy entries...");
    const pendingResponse = await fetch(`${BASE_URL}/api/admin/taxonomy/pending`);

    if (!pendingResponse.ok) {
      throw new Error(`Failed to fetch pending taxonomy: ${pendingResponse.statusText}`);
    }

    const pending = await pendingResponse.json();
    console.log(`   Found ${pending.data.entries.length} pending entries:`);
    pending.data.entries.forEach((entry: any) => {
      console.log(`   - ${entry.locationKey} (${entry.locationCount} locations)`);
    });

    // 3. Approve first pending entry
    if (pending.data.entries.length > 0) {
      const entryToApprove = pending.data.entries[0];
      console.log(`\n3️⃣ Approving taxonomy entry: ${entryToApprove.locationKey}`);

      const approveResponse = await fetch(
        `${BASE_URL}/api/admin/taxonomy/${encodeURIComponent(entryToApprove.locationKey)}/approve`,
        { method: "PATCH" }
      );

      if (!approveResponse.ok) {
        throw new Error(`Failed to approve taxonomy: ${approveResponse.statusText}`);
      }

      const approved = await approveResponse.json();
      console.log("   ✅ Approved:", approved.data.entry.locationKey);

      // 4. Verify appears in filters
      console.log("\n4️⃣ Verifying appears in country filters...");
      const countriesResponse = await fetch(`${BASE_URL}/api/location-hierarchy/countries`);

      if (!countriesResponse.ok) {
        throw new Error(`Failed to fetch countries: ${countriesResponse.statusText}`);
      }

      const countries = await countriesResponse.json();
      console.log(`   ✅ Found ${countries.countries.length} countries`);

      // Try to find the approved neighborhood in the nested structure
      const peru = countries.countries.find((c: any) => c.code === 'peru');
      if (peru) {
        const lima = peru.cities.find((city: any) => city.value === 'lima');
        if (lima) {
          const neighborhoods = lima.neighborhoods.map((n: any) => n.value);
          console.log(`   ✅ Lima neighborhoods: ${neighborhoods.join(', ')}`);

          if (neighborhoods.includes('surquillo')) {
            console.log("   🎉 Surquillo is now visible in filters!");
          } else {
            console.log("   ⚠️ Surquillo not yet visible in filters");
          }
        }
      }
    } else {
      console.log("\n⚠️ No pending entries to approve");
    }

    console.log("\n✅ Test complete!");
  } catch (error) {
    console.error("\n💥 Test failed:", error);
    process.exit(1);
  }
}

testTaxonomyWorkflow();
