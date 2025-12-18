import type { CreateMapsRequest, Location, LocationResponse } from "../models/location";
import type { PatchMapsDto } from "../validation/schemas/maps.schemas";
import { BadRequestError, NotFoundError } from "../../../shared/core/errors/http-error";
import { EnvConfig } from "../../../shared/config/env.config";
import {
  createFromMaps,
  generateGoogleMapsUrl,
  geocode,
} from "./location.helper";
import {
  getLocationById,
  saveLocation,
  updateLocationById,
} from "../repositories/location.repository";
import { getInstagramEmbedsByLocationId } from "../repositories/instagram-embed.repository";
import { getUploadsByLocationId } from "../repositories/upload.repository";
import { transformLocationToResponse } from "../utils/location-utils";
import { validateCategory, validateCategoryWithDefault } from "../utils/category-utils";

export class MapsService {
  constructor(
    private readonly config: EnvConfig
  ) {}

  async addMapsLocation(payload: CreateMapsRequest): Promise<LocationResponse> {
    if (!payload.name || !payload.address) {
      throw new BadRequestError("Name and address required");
    }

    // Validate category
    const category = validateCategory(payload.category);

    const apiKey = this.config.hasGoogleMapsKey() ? this.config.GOOGLE_MAPS_API_KEY : undefined;
    const entry = await createFromMaps(payload.name, payload.address, apiKey, category);

    saveLocation(entry);

    // Transform to response format
    const locationWithNested = {
      ...entry,
      instagram_embeds: [],
      uploads: [],
    };

    return transformLocationToResponse(locationWithNested);
  }


  async updateMapsLocationById(id: number, updates: PatchMapsDto): Promise<LocationResponse> {
    const currentLocation = getLocationById(id);
    if (!currentLocation) {
      throw new NotFoundError("Location", id);
    }

    // Validate category if provided
    const category = updates.category ? validateCategory(updates.category) : undefined;

    // Perform partial update - only update provided fields
    const updateData = {
      ...(updates.title !== undefined && { title: updates.title }),
      ...(category !== undefined && { category }),
      ...(updates.locationKey !== undefined && { locationKey: updates.locationKey }),
      ...(updates.contactAddress !== undefined && { contactAddress: updates.contactAddress }),
      ...(updates.countryCode !== undefined && { countryCode: updates.countryCode }),
      ...(updates.phoneNumber !== undefined && { phoneNumber: updates.phoneNumber }),
      ...(updates.website !== undefined && { website: updates.website }),
    };

    const success = updateLocationById(id, updateData);

    if (!success) {
      throw new BadRequestError("Failed to update location");
    }

    const updatedLocation = getLocationById(id);
    if (!updatedLocation) {
      throw new NotFoundError("Location", id);
    }

    // Fetch nested data
    const instagramEmbeds = getInstagramEmbedsByLocationId(id);
    const uploads = getUploadsByLocationId(id);

    // Transform to response format
    const locationWithNested = {
      ...updatedLocation,
      instagram_embeds: instagramEmbeds,
      uploads: uploads,
    };

    return transformLocationToResponse(locationWithNested);
  }
}
