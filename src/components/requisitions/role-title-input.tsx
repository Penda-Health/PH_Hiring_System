"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * Free-text role title field with browser-native autocomplete suggestions
 * (via <datalist>), so typing "Clinical" surfaces "Clinical Officer" etc.
 * Suggestions come from titles already in use elsewhere in the system
 * rather than a fixed, easily-stale list.
 */
export function RoleTitleInput({
  value,
  onChange,
  suggestions,
  listId,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  listId: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <>
      <Input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Start typing a role title…"}
        required={required}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map((title) => (
          <option key={title} value={title} />
        ))}
      </datalist>
    </>
  );
}
