"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

interface SearchBarProps {
  value: string;
  placeholder?: string;
  hasSearch?: boolean;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onReset: () => void;
}

export default function SearchBar({
  value,
  placeholder = "Search...",
  hasSearch = false,
  onChange,
  onSearch,
  onReset,
}: SearchBarProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
      className="flex flex-col gap-2 sm:flex-row"
    >
      <InputGroup className="h-10 min-w-0 flex-1">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" aria-label="Search">
            <Search data-icon="inline-start" />
            <span>Search</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex gap-2">
        <Button
          type="button"
          aria-label="Reset search"
          title="Reset search"
          disabled={!value && !hasSearch}
          onClick={onReset}
          variant="outline"
          size="icon"
        >
          <RotateCcw data-icon="inline-start" />
        </Button>
      </div>
    </form>
  );
}
