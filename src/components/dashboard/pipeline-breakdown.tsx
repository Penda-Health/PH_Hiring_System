"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageCounts } from "@/lib/dashboard-metrics";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

export function PipelineBreakdown() {
  const { candidates } = useRecruitmentData();
  const stageCounts = getStageCounts(candidates);
  const max = Math.max(...stageCounts.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stageCounts.map(({ stage, count }) => (
          <Link
            key={stage}
            href="/pipeline"
            className="flex items-center gap-3 group"
          >
            <span className="w-32 text-sm text-foreground/80 group-hover:text-penda-teal">{stage}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-penda-teal rounded-full"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-sm text-right font-medium">{count}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
