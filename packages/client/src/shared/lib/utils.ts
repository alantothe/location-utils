import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLocationHierarchy(locationKey: string): string {
  return locationKey
    .split("|")
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" > ");
}
