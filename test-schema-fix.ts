import { addUploadFilesSchema } from "./packages/client/src/features/locations/validation/add-upload-files.schema";

// Test that the schema validates correctly
console.log("Testing addUploadFilesSchema...");

// Test 1: Valid data with photographer credit
try {
  const result1 = addUploadFilesSchema.parse({ photographerCredit: "John Doe" });
  console.log("✅ Test 1 passed: Valid data with photographer credit", result1);
} catch (error) {
  console.log("❌ Test 1 failed:", error.message);
}

// Test 2: Valid data without photographer credit
try {
  const result2 = addUploadFilesSchema.parse({ photographerCredit: undefined });
  console.log("✅ Test 2 passed: Valid data without photographer credit", result2);
} catch (error) {
  console.log("❌ Test 2 failed:", error.message);
}

// Test 3: Valid data with empty photographer credit
try {
  const result3 = addUploadFilesSchema.parse({ photographerCredit: "" });
  console.log("✅ Test 3 passed: Valid data with empty photographer credit", result3);
} catch (error) {
  console.log("❌ Test 3 failed:", error.message);
}

// Test 4: Valid data with no photographer credit field
try {
  const result4 = addUploadFilesSchema.parse({});
  console.log("✅ Test 4 passed: Valid data with no photographer credit field", result4);
} catch (error) {
  console.log("❌ Test 4 failed:", error.message);
}

console.log("Schema testing completed!");




