import type { LocationWithNested } from "../../../models/location";
import { getAllLocations } from "../../../repositories/location.repository";
import { getAllInstagramEmbeds } from "../../../repositories/instagram-embed.repository";
import { getAllUploads } from "../../../repositories/upload.repository";

export function listLocations(): LocationWithNested[] {
  const locations = getAllLocations();
  const allEmbeds = getAllInstagramEmbeds();
  const allUploads = getAllUploads();

  return locations.map((loc) => ({
    ...loc,
    instagram_embeds: allEmbeds.filter((e) => e.location_id === loc.id),
    uploads: allUploads.filter((u) => u.location_id === loc.id),
  }));
}
