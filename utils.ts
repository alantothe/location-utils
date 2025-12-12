// Legacy shim that re-exports the reorganized utilities.
export {
  generateGoogleMapsUrl,
  extractInstagramData,
  normalizeInstagram,
  geocode as getCoordinates,
} from "./src/features/locations/services/location.factory";

export {
  parseCsv,
  parseTxt,
  processLocationsFile,
  type RawLocation,
} from "./src/shared/utils/file";
