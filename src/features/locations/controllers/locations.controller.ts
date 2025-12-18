import type { Context } from "hono";
import { ServiceContainer } from "../container/service-container";
import type { ListLocationsQueryDto } from "../validation/schemas/locations.schemas";

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
