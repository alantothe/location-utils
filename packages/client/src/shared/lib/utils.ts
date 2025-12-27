import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatLocationHierarchy as sharedFormatLocationHierarchy } from "@shared/utils/location-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatLocationHierarchy = sharedFormatLocationHierarchy;
