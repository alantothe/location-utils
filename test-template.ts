import { locationsHtmlTemplate } from "./src/features/locations/routes/home.template";

console.log("Testing HTML template loading...");

try {
  console.log("Template length:", locationsHtmlTemplate.length);
  console.log("Template starts with:", locationsHtmlTemplate.substring(0, 100));

} catch (error) {
  console.error("Error:", error);
}