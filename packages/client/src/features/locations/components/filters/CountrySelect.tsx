import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@client/components/ui/select";
import type { Country } from "@client/shared/services/api/types";

interface CountrySelectProps {
  value: string | null;
  onChange: (value: string) => void;
  countries: Country[];
  isLoading?: boolean;
}

export function CountrySelect({ value, onChange, countries, isLoading }: CountrySelectProps) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
        Country
      </label>
      <Select value={value ?? ""} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading..." : "Select country"} />
        </SelectTrigger>
        <SelectContent>
          {countries.map(country => (
            <SelectItem key={country.code} value={country.code}>
              {country.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
