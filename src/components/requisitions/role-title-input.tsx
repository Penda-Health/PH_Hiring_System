"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * Free-text role title field with a filtered suggestion list, so typing
 * "Clinical" narrows down to "Clinical Officer" etc. instead of showing
 * every existing title. Built as a plain styled dropdown rather than a
 * native <datalist> — datalists render with unstyleable OS/browser chrome
 * and don't filter as you'd expect on all platforms.
 */
export function RoleTitleInput({
  value,
  onChange,
  suggestions,
  placeholder,
  required,
  maxSuggestions = 8,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  maxSuggestions?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const query = value.trim().toLowerCase();
    const pool = query ? suggestions.filter((s) => s.toLowerCase().includes(query)) : suggestions;
    return pool.slice(0, maxSuggestions);
  }, [value, suggestions, maxSuggestions]);

  React.useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Start typing a role title…"}
        required={required}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          {filtered.map((title) => (
            <li key={title}>
              <button
                type="button"
                className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(title);
                  setOpen(false);
                }}
              >
                {title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
