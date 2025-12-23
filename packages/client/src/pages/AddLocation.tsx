import { useState } from "react";
import { useCreateLocation } from "../features/api";
import type { Category } from "../features/api/types";

export function AddLocation() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState<Category>("dining");

  const { mutate, isPending, isSuccess, error } = useCreateLocation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    mutate(
      { name, address, category },
      {
        onSuccess: () => {
          // Reset form
          setName("");
          setAddress("");
          setCategory("dining");
        },
      }
    );
  }

  return (
    <div>
      <h1>Add Location</h1>
      <p>Add a new location with Google Maps or Instagram.</p>

      <form onSubmit={handleSubmit} style={{ marginTop: "2rem", maxWidth: "600px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Location Name"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #333",
              borderRadius: "4px",
              backgroundColor: "#1a1a1a",
              color: "#fff"
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="address" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Address
          </label>
          <input
            type="text"
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, State, Country"
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #333",
              borderRadius: "4px",
              backgroundColor: "#1a1a1a",
              color: "#fff"
            }}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="category" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #333",
              borderRadius: "4px",
              backgroundColor: "#1a1a1a",
              color: "#fff"
            }}
          >
            <option value="dining">Dining</option>
            <option value="accommodations">Accommodations</option>
            <option value="attractions">Attractions</option>
            <option value="nightlife">Nightlife</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending || !name || !address}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            fontWeight: "500",
            border: "none",
            borderRadius: "4px",
            backgroundColor: isPending || !name || !address ? "#555" : "#646cff",
            color: "#fff",
            cursor: isPending || !name || !address ? "not-allowed" : "pointer",
            transition: "background-color 0.3s"
          }}
        >
          {isPending ? "Adding Location..." : "Add Location"}
        </button>

        {error && (
          <div style={{ color: "red", marginTop: "1rem", padding: "0.75rem", backgroundColor: "rgba(255, 0, 0, 0.1)", borderRadius: "4px" }}>
            Error: {error.message}
          </div>
        )}

        {isSuccess && (
          <div style={{ color: "green", marginTop: "1rem", padding: "0.75rem", backgroundColor: "rgba(0, 255, 0, 0.1)", borderRadius: "4px" }}>
            Location added successfully!
          </div>
        )}
      </form>
    </div>
  );
}
