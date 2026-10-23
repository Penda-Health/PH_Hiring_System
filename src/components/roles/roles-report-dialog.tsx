"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { OpenRole, Priority, RoleStatus, Segment } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RolesFilterState } from "@/components/roles/roles-filters";

const SEGMENTS: Segment[] = ["IPS", "SO"];
const STATUSES: RoleStatus[] = ["Open", "Allocated", "Filled", "On Hold", "Cancelled"];
const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];

interface ReportState {
  segments: string[];
  statuses: string[];
  priorities: string[];
  departments: string[];
  locations: string[];
  recruiters: string[];
  postedFrom: string;
  postedTo: string;
  includePipeline: boolean;
  includeUpdates: boolean;
  format: "pdf" | "csv";
}

// Toggle chips for a multi-select. Nothing selected means "all".
function ChipGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-[11px] text-muted-foreground">
          {selected.length === 0 ? "All" : `${selected.length} selected`}
          {selected.length > 0 && (
            <button type="button" className="ml-2 text-penda-blue hover:underline" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </span>
      </div>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? selected.filter((s) => s !== o) : [...selected, o])}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                on ? "border-penda-blue bg-penda-blue text-white" : "border-border hover:border-penda-blue/60"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function initialState(filters: RolesFilterState): ReportState {
  return {
    segments: filters.segment === "All" ? [] : [filters.segment],
    statuses: ["Open"],
    priorities: filters.priority === "All" ? [] : [filters.priority],
    departments: filters.department === "All" ? [] : [filters.department],
    locations: filters.segment === "IPS" ? filters.branches : [],
    recruiters: [],
    postedFrom: "",
    postedTo: "",
    includePipeline: true,
    includeUpdates: true,
    format: "pdf",
  };
}

export function RolesReportDialog({
  open,
  onOpenChange,
  roles,
  filters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: OpenRole[];
  /** The register's current filters, used as the starting point. */
  filters: RolesFilterState;
}) {
  const [state, setState] = React.useState<ReportState>(() => initialState(filters));
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setState(initialState(filters));
      setError(null);
    }
    // Only re-seed when the dialog opens, not on every register filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Option lists come from roles in the chosen segment(s), so SO departments
  // don't show up in an IPS-only report.
  const scoped = state.segments.length ? roles.filter((r) => state.segments.includes(r.segment)) : roles;
  const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const departments = uniq(scoped.map((r) => r.department));
  const locations = uniq(scoped.map((r) => r.location));
  const recruiters = uniq(scoped.map((r) => r.recruiter || "Unassigned"));

  const set = <K extends keyof ReportState>(key: K, value: ReportState[K]) => setState((s) => ({ ...s, [key]: value }));

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      state.segments.forEach((v) => q.append("segment", v));
      state.statuses.forEach((v) => q.append("status", v));
      state.priorities.forEach((v) => q.append("priority", v));
      state.departments.forEach((v) => q.append("department", v));
      state.locations.forEach((v) => q.append("location", v));
      state.recruiters.forEach((v) => q.append("recruiter", v));
      if (state.postedFrom) q.set("postedFrom", state.postedFrom);
      if (state.postedTo) q.set("postedTo", state.postedTo);
      q.set("pipeline", state.includePipeline ? "1" : "0");
      q.set("updates", state.includeUpdates ? "1" : "0");
      q.set("format", state.format);

      const res = await fetch(`/api/open-roles/report?${q.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const name =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        `roles-report.${state.format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      onOpenChange(false);
    } catch (err) {
      console.error("[roles-report] download failed:", err);
      setError("Couldn't generate the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Download roles report</DialogTitle>
          <DialogDescription>
            Choose what goes in the report. A filter with nothing selected includes everything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ChipGroup label="Segment" options={SEGMENTS} selected={state.segments} onChange={(v) => set("segments", v)} />
          <ChipGroup label="Status" options={STATUSES} selected={state.statuses} onChange={(v) => set("statuses", v)} />
          <ChipGroup label="Priority" options={PRIORITIES} selected={state.priorities} onChange={(v) => set("priorities", v)} />
          <ChipGroup label="Department" options={departments} selected={state.departments} onChange={(v) => set("departments", v)} />
          <ChipGroup label="Location" options={locations} selected={state.locations} onChange={(v) => set("locations", v)} />
          <ChipGroup label="Recruiter" options={recruiters} selected={state.recruiters} onChange={(v) => set("recruiters", v)} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-posted-from" className="text-xs font-medium">Posted from</Label>
              <Input id="report-posted-from" type="date" value={state.postedFrom} onChange={(e) => set("postedFrom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-posted-to" className="text-xs font-medium">Posted to</Label>
              <Input id="report-posted-to" type="date" value={state.postedTo} onChange={(e) => set("postedTo", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Include</Label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.includePipeline} onChange={(e) => set("includePipeline", e.target.checked)} />
              Candidate pipeline by stage
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={state.includeUpdates} onChange={(e) => set("includeUpdates", e.target.checked)} />
              Recruiter updates (latest 3 per role)
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Format</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="report-format" checked={state.format === "pdf"} onChange={() => set("format", "pdf")} />
                PDF
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="report-format" checked={state.format === "csv"} onChange={() => set("format", "csv")} />
                Excel / CSV
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={downloading}>
            Cancel
          </Button>
          <Button onClick={download} disabled={downloading}>
            <Download />
            {downloading ? "Generating…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
