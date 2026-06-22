"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getKpis } from "@/lib/dashboard-metrics";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

export function AiSummaryCard() {
  const { openRoles, candidates, offers } = useRecruitmentData();
  const [summary, setSummary] = React.useState<string | null>(null);

  function generateSummary() {
    const { openRolesCount, activePipeline, totalHcGap, pendingOffers } = getKpis(openRoles, candidates, offers);
    setSummary(
      `You have ${openRolesCount} open roles with a combined headcount gap of ${totalHcGap}. ` +
        `${activePipeline} candidates are active in the pipeline and ${pendingOffers} offers are awaiting a decision. ` +
        `Stub summary — wire up to the real AI assistant when ready.`
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-penda-teal" /> AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary ? (
          <p className="text-sm text-foreground/90">{summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Generate a quick recap of today&apos;s recruiting status.
          </p>
        )}
        <Button size="sm" variant="outline" onClick={generateSummary}>
          {summary ? "Regenerate" : "Generate Summary"}
        </Button>
      </CardContent>
    </Card>
  );
}
