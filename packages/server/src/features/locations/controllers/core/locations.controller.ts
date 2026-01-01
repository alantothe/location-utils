import type { Context } from "hono";
import { ServiceContainer } from "../../container/service-container";
import { successResponse, errorResponse } from "@shared/types/api-response";
import type { ListLocationsQueryDto, DeleteLocationSlugDto, DeleteLocationIdDto } from "../../validation/schemas/locations.schemas";

const container = ServiceContainer.getInstance();

export function getLocations(c: Context) {
  const query = c.get("validatedQuery") as ListLocationsQueryDto | undefined;
  const locations = container.locationQueryService.listLocations(
    query?.category,
    query?.locationKey
  );
  const cwd = process.cwd();
  return c.json({ locations, cwd });
}

export function getLocationsBasic(c: Context) {
  const query = c.get("validatedQuery") as ListLocationsQueryDto | undefined;
  const locations = container.locationQueryService.listLocationsBasic(
    query?.category,
    query?.locationKey
  );
  return c.json({ locations });
}

export async function deleteLocationBySlug(c: Context) {
  const dto = c.get("validatedParams") as DeleteLocationSlugDto;

  const deleted = await container.locationMutationService.deleteLocationBySlug(dto.slug);

  if (!deleted) {
    return c.json(errorResponse("Location not found"), 404);
  }

  return c.json(successResponse({ message: "Location deleted successfully" }));
}

export async function deleteLocationById(c: Context) {
  const dto = c.get("validatedParams") as DeleteLocationIdDto;

  const deleted = await container.locationMutationService.deleteLocationById(dto.id);

  if (!deleted) {
    return c.json(errorResponse("Location not found"), 404);
  }

  return c.json(successResponse({ message: "Location deleted successfully" }));
}

export function getLocationById(c: Context) {
  const dto = c.get("validatedParams") as DeleteLocationIdDto;

  const location = container.locationQueryService.getLocationById(dto.id);

  if (!location) {
    return c.json(errorResponse("Location not found"), 404);
  }

  return c.json(location);
}
