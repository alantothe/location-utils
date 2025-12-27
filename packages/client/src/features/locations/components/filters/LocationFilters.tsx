import { Button } from "@client/components/ui/button";
import { CountrySelect } from "./CountrySelect";
import { CategorySelect } from "./CategorySelect";
import type { Category, Country } from "@client/shared/services/api/types";

interface LocationFiltersProps {
  selectedCountry: string | null;
  selectedCategory: Category | null;
  onCountryChange: (value: string) => void;
  onCategoryChange: (value: Category) => void;
  onReset: () => void;
  countries: Country[];
  isLoadingCountries: boolean;
}

export function LocationFilters({
  selectedCountry,
  selectedCategory,
  onCountryChange,
  onCategoryChange,
  onReset,
  countries,
  isLoadingCountries
}: LocationFiltersProps) {
  const hasFilters = selectedCountry || selectedCategory;

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1rem" }}>
      <CountrySelect
        value={selectedCountry}
        onChange={onCountryChange}
        countries={countries}
        isLoading={isLoadingCountries}
      />

      <CategorySelect
        value={selectedCategory}
        onChange={onCategoryChange}
        disabled={!selectedCountry}
      />

      <Button
        variant="outline"
        onClick={onReset}
        disabled={!hasFilters}
      >
        Clear Filters
      </Button>
    </div>
  );
}
