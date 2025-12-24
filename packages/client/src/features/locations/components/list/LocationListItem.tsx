import { formatLocationHierarchy } from "@client/shared/lib/utils";

interface LocationListItemProps {
  location: {
    id: number;
    name: string;
    category: string;
    location?: string;
  };
  onClick?: (id: number) => void;
}

export function LocationListItem({ location, onClick }: LocationListItemProps) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "6px",
        padding: "0.75rem",
        backgroundColor: "#ffffff",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={() => onClick?.(location.id)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: "500", color: "#1a1a1a" }}>
          {location.name}
        </span>
        <span style={{ fontSize: "0.875rem", color: "#666", textTransform: "capitalize" }}>
          {location.category}
        </span>
      </div>
      {location.location && (
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "#666" }}>
          {formatLocationHierarchy(location.location)}
        </p>
      )}
    </div>
  );
}
