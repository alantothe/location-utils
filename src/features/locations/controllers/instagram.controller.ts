import type { Context } from "hono";
import { ServiceContainer } from "../container/service-container";
import { successResponse } from "../../../shared/core/types/api-response";
import type { AddInstagramDto, AddInstagramParamsDto } from "../validation/schemas/instagram.schemas";
import type { AddInstagramRequest } from "../models/location";

const container = ServiceContainer.getInstance();

export async function postAddInstagram(c: Context) {
  // Extract validated URL parameter
  const params = c.get("validatedParams") as AddInstagramParamsDto;
  const locationId = params.id;

  // Extract validated body
  const dto = c.get("validatedBody") as AddInstagramDto;

  // Compose full payload for service
  const payload: AddInstagramRequest = {
    embedCode: dto.embedCode,
    locationId: locationId
  };

  const entry = await container.instagramService.addInstagramEmbed(payload);
  return c.json(successResponse({ entry }));
}
