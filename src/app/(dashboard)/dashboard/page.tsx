import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { PipelineBreakdown } from "@/components/dashboard/pipeline-breakdown";
import { SegmentSplit } from "@/components/dashboard/segment-split";
import { AiSummaryCard } from "@/components/dashboard/ai-summary-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <MetricsGrid />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <PipelineBreakdown />
        </div>
        <div className="space-y-4">
          <SegmentSplit />
          <AiSummaryCard />
        </div>
      </div>
      <ActivityFeed />
    </div>
  );
}
