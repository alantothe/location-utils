import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@client/components/ui/select";
import type { Category } from "@client/shared/services/api/types";

interface CategorySelectProps {
  value: Category | null;
  onChange: (value: Category) => void;
  disabled?: boolean;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "dining", label: "Dining" },
  { value: "accommodations", label: "Accommodations" },
  { value: "attractions", label: "Attractions" },
  { value: "nightlife", label: "Nightlife" }
];

export function CategorySelect({ value, onChange, disabled }: CategorySelectProps) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
        Category
      </label>
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(cat => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
