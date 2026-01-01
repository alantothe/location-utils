import type { LocationResponse } from "../../../models/location";
import type { PayloadApiClient, PayloadLocationCreateData } from "@server/shared/services/external/payload-api.client";
import { formatLocationName, parseLocationValue } from "../../../utils/location-utils";

/**
 * Resolve Payload location reference by locationKey
 */
export async function resolvePayloadLocationRef(
  location: LocationResponse,
  payloadClient: PayloadApiClient
): Promise<string | null> {
  const locationKey = location.locationKey || "";

  if (!locationKey) {
    console.warn(`⚠️  Location ${location.id} missing locationKey; skipping Payload location lookup`);
    return null;
  }

  const locationRef = await payloadClient.getLocationRefByKey(locationKey);

  if (locationRef) {
    return locationRef;
  }

  console.warn(`⚠️  No Payload location found for locationKey: ${locationKey}`);

  const createPayload = buildPayloadLocationData(locationKey);
  if (!createPayload) {
    console.warn(`⚠️  Unable to build Payload location payload for ${locationKey}`);
    return null;
  }

  console.log("🧭 Creating Payload location", {
    locationKey,
    payload: createPayload,
  });

  const createdRef = await payloadClient.createLocation(createPayload);
  console.log("✅ Payload location created", {
    locationKey,
    locationRef: createdRef,
  });

  return createdRef;
}

/**
 * Build a Payload location payload from a locationKey
 */
export function buildPayloadLocationData(locationKey: string): PayloadLocationCreateData | null {
  const parsed = parseLocationValue(locationKey);
  if (!parsed) {
    return null;
  }

  const countryName = formatLocationName(parsed.country);

  if (parsed.city && parsed.neighborhood) {
    return {
      level: "neighborhood",
      country: parsed.country,
      city: parsed.city,
      neighborhood: parsed.neighborhood,
      countryName,
      cityName: formatLocationName(parsed.city),
      neighborhoodName: formatLocationName(parsed.neighborhood),
    };
  }

  if (parsed.city) {
    return {
      level: "city",
      country: parsed.country,
      city: parsed.city,
      countryName,
      cityName: formatLocationName(parsed.city),
    };
  }

  return {
    level: "country",
    country: parsed.country,
    countryName,
  };
}
