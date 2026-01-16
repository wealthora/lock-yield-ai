import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countries, Country } from "@/lib/countries";

interface CountrySelectorProps {
  value?: string;
  onSelect: (country: Country) => void;
  placeholder?: string;
  className?: string;
}

export function CountrySelector({ 
  value, 
  onSelect, 
  placeholder = "Select country...",
  className 
}: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedCountry = React.useMemo(() => {
    return countries.find(c => c.code === value || c.name === value);
  }, [value]);

  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries;
    const query = searchQuery.toLowerCase();
    return countries.filter(
      c => c.name.toLowerCase().includes(query) || 
           c.dialCode.includes(query) ||
           c.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !selectedCountry && "text-muted-foreground",
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="truncate">{selectedCountry.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {filteredCountries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.code}
                  onSelect={() => {
                    onSelect(country);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCountry?.code === country.code
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span className="text-lg mr-2">{country.flag}</span>
                  <span className="flex-1 truncate">{country.name}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {country.dialCode}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
