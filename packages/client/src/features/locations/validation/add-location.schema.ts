import { z } from "zod";
import type { LocationCategory } from "@shared/types/location-category";

const locationCategorySchema = z.enum([
  "dining",
  "accommodations",
  "attractions",
  "nightlife"
] as const satisfies readonly LocationCategory[]);

export const addLocationSchema = z.object({
  name: z
    .string()
    .min(1, "Location name is required")
    .max(200, "Name must be less than 200 characters"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(500, "Address must be less than 500 characters"),
  category: locationCategorySchema,
});

export type AddLocationFormData = z.infer<typeof addLocationSchema>;
