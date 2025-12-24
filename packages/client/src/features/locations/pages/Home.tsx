import { useLocationsBasic } from "@client/shared/services/api";
import { LocationList, LocationListEmpty } from "../components/list";

export function Home() {
  const { data, isLoading, error, refetch } = useLocationsBasic();
  const locations = (data?.locations ?? []).map(location => ({
    ...location,
    location: location.location ?? undefined,
    category: location.category
  }));

  if (isLoading) {
    return (
      <div>
        <h1>Welcome to Location Manager</h1>
        <p>Loading locations...</p>
      </div>
    );
  }

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
      <p>Manage your locations with Google Maps and Instagram integration.</p>

      <div style={{ marginTop: "2rem" }}>
        <h2>All Locations ({locations.length})</h2>

        {locations.length === 0 ? (
          <LocationListEmpty />
        ) : (
          <LocationList locations={locations} />
        )}
      </div>
    </div>
  );
}
