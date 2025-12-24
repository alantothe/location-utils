import { useLocations, useDeleteLocation } from "@client/shared/services/api";
import { useAlert } from "@client/shared/hooks";
import { DeleteButton } from "@client/shared/components/ui";

export function Home() {
  const { data, isLoading, error, refetch } = useLocations();
  const deleteLocationMutation = useDeleteLocation();
  const { showConfirm, showSuccess, showError } = useAlert();
  const locations = data?.locations ?? [];

  const handleDeleteLocation = async (slug: string | null, locationName: string) => {
    if (!slug) {
      showError("Cannot delete location: no slug available", "Error");
      return;
    }

    showConfirm({
      title: "Delete Location",
      message: `Are you sure you want to delete "${locationName}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteLocationMutation.mutateAsync(slug);
          showSuccess("Location deleted successfully", "Success");
        } catch (error) {
          console.error("Failed to delete location:", error);
          showError("Failed to delete location. Please try again.", "Error");
        }
      }
    });
  };

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
          <p>No locations found. Add your first location to get started!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {locations.map((location) => (
              <div
                key={location.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "1rem",
                  backgroundColor: "#ffffff"
                }}
              >
                <h3 style={{ margin: "0 0 1rem 0", color: "#1a1a1a", fontSize: "1.25rem" }}>
                  {location.title || location.source.name}
                </h3>
                <p style={{ margin: "0.5rem 0", color: "#2c2c2c" }}>
                  <strong>Category:</strong> {location.category}
                </p>
                {location.locationKey && (
                  <p style={{ margin: "0.5rem 0", color: "#2c2c2c" }}>
                    <strong>Location:</strong> {location.locationKey.split("|").join(" > ")}
                  </p>
                )}
                <p style={{ margin: "0.5rem 0", color: "#2c2c2c" }}>
                  <strong>Address:</strong> {location.contact.contactAddress}
                </p>
                {location.contact.phoneNumber && (
                  <p style={{ margin: "0.5rem 0", color: "#2c2c2c" }}>
                    <strong>Phone:</strong> {location.contact.phoneNumber}
                  </p>
                )}
                {location.contact.website && (
                  <p style={{ margin: "0.5rem 0", color: "#2c2c2c" }}>
                    <strong>Website:</strong>{" "}
                    <a href={location.contact.website} target="_blank" rel="noopener noreferrer">
                      {location.contact.website}
                    </a>
                  </p>
                )}
                <p style={{ margin: "0.5rem 0", fontSize: "0.875rem", color: "#555" }}>
                  Instagram embeds: {location.instagram_embeds.length} |
                  Uploads: {location.uploads.length}
                </p>
                <DeleteButton
                  onClick={() => handleDeleteLocation(location.slug, location.title || location.source.name)}
                  isLoading={deleteLocationMutation.isPending}
                  deleteText="Delete Location"
                  deletingText="Deleting..."
                  className="mt-4"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
