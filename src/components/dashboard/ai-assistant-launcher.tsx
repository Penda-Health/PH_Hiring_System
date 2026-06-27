"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getKpis } from "@/lib/dashboard-metrics";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

export function AiAssistantLauncher() {
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
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open Penny, your AI assistant"
          className="fixed right-5 bottom-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-penda-teal text-white shadow-lg hover:bg-penda-teal-dark transition-colors"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-penda-teal" /> Penny
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 pt-2">
          {summary ? (
            <p className="text-sm text-foreground/90">{summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Generate a quick recap of today&apos;s recruiting status.</p>
          )}
          <Button size="sm" variant="outline" onClick={generateSummary}>
            {summary ? "Regenerate" : "Generate Summary"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
