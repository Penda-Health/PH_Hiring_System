"use client";

import * as React from "react";
import { Branch } from "@/types";

function groupByRegion(branches: Branch[]): { region: string; branches: Branch[] }[] {
  const map = new Map<string, Branch[]>();
  for (const b of branches.filter((b) => b.active)) {
    const region = b.region || "Other";
    if (!map.has(region)) map.set(region, []);
    map.get(region)!.push(b);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, branches]) => ({ region, branches }));
}

// Region-grouped branch checkbox picker, shared by the Locum and Reliever
// pool cards/dialogs so "Branches Covered" edits the same way everywhere.
export function BranchMultiSelect({
  branches,
  selected,
  onChange,
}: {
  branches: Branch[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const grouped = React.useMemo(() => groupByRegion(branches), [branches]);

  // Values already in `selected` that don't match a real, active branch —
  // e.g. legacy free-text entries like "Multiple Locations" from before this
  // picker existed. Surfaced as removable chips so they can be cleaned up
  // instead of silently staying stuck forever with no way to uncheck them.
  const knownNames = React.useMemo(() => new Set(branches.map((b) => b.name)), [branches]);
  const legacyValues = selected.filter((s) => !knownNames.has(s));

  function toggleBranch(branchName: string) {
    onChange(
      selected.includes(branchName)
        ? selected.filter((b) => b !== branchName)
        : [...selected, branchName]
    );
  }

  function toggleRegion(regionBranches: Branch[]) {
    const names = regionBranches.map((b) => b.name);
    const allSelected = names.every((n) => selected.includes(n));
    onChange(
      allSelected
        ? selected.filter((b) => !names.includes(b))
        : Array.from(new Set([...selected, ...names]))
    );
  }

  return (
    <div className="space-y-2">
      {legacyValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {legacyValues.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(selected.filter((s) => s !== value))}
              title="Remove"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
            >
              {value} ×
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 rounded-md border border-border p-2">
        {grouped.map(({ region, branches: regionBranches }) => {
          const names = regionBranches.map((b) => b.name);
          const allSelected = names.every((n) => selected.includes(n));
          const someSelected = names.some((n) => selected.includes(n));
          return (
            <div key={region}>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={() => toggleRegion(regionBranches)}
                  className="h-3.5 w-3.5 rounded border-border accent-penda-blue"
                />
                {region}
              </label>
              <div className="grid grid-cols-2 gap-1.5 pl-5">
                {regionBranches.map((branch) => (
                  <label key={branch.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(branch.name)}
                      onChange={() => toggleBranch(branch.name)}
                      className="h-4 w-4 rounded border-border accent-penda-blue"
                    />
                    {branch.name}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {grouped.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">No branches available</p>
        )}
      </div>
    </div>
  );
}
