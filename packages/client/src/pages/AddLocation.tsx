import { useState } from "react";

export function AddLocation() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("dining");

  return (
    <div>
      <h1>Add Location</h1>
      <p>Add a new location with Google Maps or Instagram.</p>

      <form style={{ marginTop: "2rem", maxWidth: "600px" }}>
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
            onChange={(e) => setCategory(e.target.value)}
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
            <option value="attraction">Attraction</option>
            <option value="accommodation">Accommodation</option>
            <option value="shopping">Shopping</option>
            <option value="entertainment">Entertainment</option>
          </select>
        </div>
      </form>
    </div>
  );
}
