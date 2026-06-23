"use client";

import * as React from "react";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { PipelineBreakdown } from "@/components/dashboard/pipeline-breakdown";
import { SegmentSplit } from "@/components/dashboard/segment-split";
import { AiSummaryCard } from "@/components/dashboard/ai-summary-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardFilterState, DEFAULT_DASHBOARD_FILTERS } from "@/lib/dashboard-filters";

export default function DashboardPage() {
  const [filters, setFilters] = React.useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTERS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>
      <MetricsGrid filters={filters} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PipelineBreakdown filters={filters} />
        </div>
        <div className="space-y-4">
          <SegmentSplit filters={filters} />
          <AiSummaryCard />
        </div>
      </div>
      <ActivityFeed />
    </div>
  );
}
