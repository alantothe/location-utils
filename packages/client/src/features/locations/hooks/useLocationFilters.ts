import { useState } from "react";
import type { Category } from "@client/shared/services/api/types";

export function useLocationFilters() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleCountryChange = (country: string | null) => {
    setSelectedCountry(country);
    if (!country) setSelectedCategory(null); // Reset category when country cleared
  };

  const reset = () => {
    setSelectedCountry(null);
    setSelectedCategory(null);
  };

  return {
    selectedCountry,
    selectedCategory,
    setCountry: handleCountryChange,
    setCategory: setSelectedCategory,
    reset,
    isFilterActive: !!(selectedCountry && selectedCategory)
  };
}
