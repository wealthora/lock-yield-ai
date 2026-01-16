import * as React from "react";
import { Input } from "@/components/ui/input";
import { Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  country?: Country;
  value: string;
  onChange: (fullNumber: string, localNumber: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  id?: string;
  name?: string;
}

export function PhoneInput({
  country,
  value,
  onChange,
  placeholder = "Phone number",
  className,
  required,
  id,
  name,
}: PhoneInputProps) {
  // Extract local number from full value (remove dial code if present)
  const localNumber = React.useMemo(() => {
    if (!country) return value;
    if (value.startsWith(country.dialCode)) {
      return value.slice(country.dialCode.length).replace(/^\s+/, "");
    }
    // Check if it starts with any dial code pattern
    if (value.startsWith("+")) {
      const match = value.match(/^\+\d+\s*/);
      if (match) {
        return value.slice(match[0].length);
      }
    }
    return value;
  }, [value, country]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow numbers, spaces, and dashes in local part
    const cleanedInput = input.replace(/[^\d\s\-]/g, "");
    
    if (country) {
      const fullNumber = `${country.dialCode} ${cleanedInput}`.trim();
      onChange(fullNumber, cleanedInput);
    } else {
      onChange(cleanedInput, cleanedInput);
    }
  };

  return (
    <div className={cn("flex", className)}>
      <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted/50 text-muted-foreground min-w-[80px] justify-center">
        {country ? (
          <>
            <span className="text-lg mr-1.5">{country.flag}</span>
            <span className="text-sm font-medium">{country.dialCode}</span>
          </>
        ) : (
          <span className="text-sm">+--</span>
        )}
      </div>
      <Input
        id={id}
        name={name}
        type="tel"
        value={localNumber}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="rounded-l-none flex-1"
      />
    </div>
  );
}
