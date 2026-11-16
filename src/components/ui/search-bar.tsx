"use client";

import { RotateCcw, Search } from "lucide-react";
import Input from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      <div className="relative min-w-0 flex-1">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <Input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="pl-11 pr-4"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          className="h-11 flex-1 rounded-xl bg-zinc-800 px-5 text-white hover:bg-zinc-700 sm:flex-none"
        >
          <Search size={16} />
          Search
        </Button>
        <Button
          type="button"
          aria-label="Reset search"
          title="Reset search"
          disabled={!value && !hasSearch}
          onClick={onReset}
          variant="outline"
          size="icon-lg"
          className="h-11 w-11 rounded-xl border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          <RotateCcw size={17} />
        </Button>
      </div>
    </form>
  );
}
