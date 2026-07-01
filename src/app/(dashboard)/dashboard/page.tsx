"use client";

import * as React from "react";
import { MetricsGrid, OVERVIEW_METRIC_NAMES, DETAIL_METRIC_NAMES, getMetricValue } from "@/components/dashboard/metrics-grid";
import { PipelineBreakdown } from "@/components/dashboard/pipeline-breakdown";
import { SegmentSplit } from "@/components/dashboard/segment-split";
import { RateGauge } from "@/components/dashboard/rate-gauge";
import { DepartmentPipelineOverview } from "@/components/dashboard/department-pipeline-overview";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { getAllMetrics } from "@/lib/dashboard-metrics";
import { DashboardFilterState, DEFAULT_DASHBOARD_FILTERS, filterDashboardData } from "@/lib/dashboard-filters";

export default function DashboardPage() {
  const [filters, setFilters] = React.useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTERS);
  const { candidates, openRoles, offers, workTrials, interviews, relievers, locums, newEmployees, extendedLoading } =
    useRecruitmentData();
  const filtered = filterDashboardData(
    { candidates, openRoles, offers, workTrials, interviews, relievers, locums },
    filters
  );
  const metrics = getAllMetrics({ ...filtered, newEmployees });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {extendedLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading full metrics…</span>
          )}
        </div>
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ErrorBoundary inline>
            <MetricsGrid metrics={metrics} names={OVERVIEW_METRIC_NAMES} columns={3} />
          </ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ErrorBoundary inline>
                <PipelineBreakdown filters={filters} />
              </ErrorBoundary>
            </div>
            <ErrorBoundary inline>
              <SegmentSplit filters={filters} />
            </ErrorBoundary>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ErrorBoundary inline>
              <RateGauge
                title="Offer Acceptance Rate"
                value={getMetricValue(metrics, "Offer Acceptance Rate")}
                target="≥80%"
                color="#005B5E"
              />
            </ErrorBoundary>
            <ErrorBoundary inline>
              <RateGauge
                title="No-Show Rate"
                value={getMetricValue(metrics, "No-Show Rate")}
                target="<10%"
                color="#A32D2D"
              />
            </ErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <ErrorBoundary inline>
            <MetricsGrid metrics={metrics} names={DETAIL_METRIC_NAMES} />
          </ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ErrorBoundary inline>
              <DepartmentPipelineOverview />
            </ErrorBoundary>
            <ErrorBoundary inline>
              <ActivityFeed />
            </ErrorBoundary>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
