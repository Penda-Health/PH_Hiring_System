"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeWeightedTotal, computePassFail, CULTURE_AUTO_FAIL_BELOW } from "@/lib/work-trial-helpers";

export function ScoreEntryDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (scores: { technical: number; patient: number; culture: number }) => void;
}) {
  const [scores, setScores] = React.useState({ technical: 0, patient: 0, culture: 0 });
  const total = computeWeightedTotal(scores);
  const passFail = computePassFail(scores);
  const cultureAutoFail = scores.culture > 0 && scores.culture < CULTURE_AUTO_FAIL_BELOW;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(scores);
    onOpenChange(false);
    setScores({ technical: 0, patient: 0, culture: 0 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Work Trial Scores</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <ScoreField label="Culture Fit (40%)" value={scores.culture} onChange={(v) => setScores((s) => ({ ...s, culture: v }))} />
            <ScoreField label="Patient Experience (30%)" value={scores.patient} onChange={(v) => setScores((s) => ({ ...s, patient: v }))} />
            <ScoreField label="Technical Fit (30%)" value={scores.technical} onChange={(v) => setScores((s) => ({ ...s, technical: v }))} />
          </div>
          {cultureAutoFail && (
            <p className="text-sm text-destructive">
              Culture Fit 6/10 or below — automatic fail regardless of other scores.
            </p>
          )}
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="text-sm font-medium">Weighted Total</span>
            <span className={`text-lg font-semibold ${passFail === "Pass" ? "text-penda-teal" : "text-destructive"}`}>
              {total} — {passFail}
            </span>
          </div>
          <DialogFooter>
            <Button type="submit" className="bg-penda-teal hover:bg-penda-teal-dark">
              Save Scores
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScoreField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        required
      />
    </div>
  );
}
