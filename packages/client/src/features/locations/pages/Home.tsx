import { useLocationsBasic } from "@client/shared/services/api";
import { LocationList, LocationListEmpty } from "../components/list";
import { LocationFilters } from "../components/filters";
import { useLocationFilters } from "../hooks/useLocationFilters";
import { useCountries } from "../hooks/useCountries";
import { countryCodeToLocationKey } from "../utils/filter-utils";

export function Home() {
  const filters = useLocationFilters();
  const { data: countries = [], isLoading: isLoadingCountries } = useCountries();

  // Build API params only when both filters selected
  const apiParams = filters.isFilterActive && filters.selectedCountry
    ? {
        category: filters.selectedCategory!,
        locationKey: countryCodeToLocationKey(filters.selectedCountry, countries)!
      }
    : undefined;

  const { data, isLoading, error, refetch } = useLocationsBasic(apiParams);
  const locations = (data?.locations ?? []).map(location => ({
    ...location,
    location: location.location ?? undefined,
    category: location.category
  }));

  if (error) {
    return (
      <div>
        <h1>Welcome to Location Manager</h1>
        <p style={{ color: "red" }}>Error: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome to Location Manager</h1>

      <LocationFilters
        selectedCountry={filters.selectedCountry}
        selectedCategory={filters.selectedCategory}
        onCountryChange={filters.setCountry}
        onCategoryChange={filters.setCategory}
        onReset={filters.reset}
        countries={countries}
        isLoadingCountries={isLoadingCountries}
      />

      <div style={{ marginTop: "2rem" }}>
        <h2>
          {filters.isFilterActive ? "Filtered Locations" : "All Locations"} ({locations.length})
        </h2>

        {isLoading ? (
          <p>Loading locations...</p>
        ) : locations.length === 0 ? (
          <LocationListEmpty />
        ) : (
          <LocationList locations={locations} />
        )}
      </div>
    </div>
  );
}
