import { z } from "zod";
import type { LocationCategory } from "@shared/types/location-category";

const locationCategorySchema = z.enum([
  "dining",
  "accommodations",
  "attractions",
  "nightlife"
] as const satisfies readonly LocationCategory[]);

export const editLocationSchema = z.object({
  title: z
    .string()
    .max(200, "Title must be less than 200 characters")
    .optional(),
  category: locationCategorySchema.optional(),
  contactAddress: z
    .string()
    .max(500, "Address must be less than 500 characters")
    .optional(),
  phoneNumber: z
    .string()
    .max(20, "Phone number must be less than 20 characters")
    .optional(),
  website: z
    .string()
    .url("Website must be a valid URL")
    .optional()
    .or(z.literal("")),
});

export type EditLocationFormData = z.infer<typeof editLocationSchema>;
