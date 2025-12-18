import { z } from "zod";
import { locationCategorySchema } from "./maps.schemas";

export const listLocationsQuerySchema = z.object({
  category: locationCategorySchema.optional(),
  locationKey: z.string()
    .trim()
    .regex(/^[a-z0-9-]+(\|[a-z0-9-]+){0,2}$/,
      "Invalid locationKey format. Expected: country or country|city or country|city|neighborhood")
    .optional(),
}).strict();

export type ListLocationsQueryDto = z.infer<typeof listLocationsQuerySchema>;
