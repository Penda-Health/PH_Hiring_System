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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OfferActionMode = "counter" | "decline" | "withdraw";

const COPY: Record<OfferActionMode, { title: string; cta: string }> = {
  counter: { title: "Record Counter Offer", cta: "Save Counter" },
  decline: { title: "Decline Offer", cta: "Confirm Decline" },
  withdraw: { title: "Withdraw Offer", cta: "Confirm Withdraw" },
};

const OTHER_REASON = "Other";

const COMMON_REASONS: Record<"decline" | "withdraw", string[]> = {
  decline: [
    "Accepted another offer",
    "Salary/offer too low",
    "Location or commute",
    "Counter offer not met",
    "No longer interested",
    "Unresponsive candidate",
    OTHER_REASON,
  ],
  withdraw: [
    "Position no longer available",
    "Budget freeze/headcount cut",
    "Failed reference check",
    "Failed background check",
    "Role re-prioritized",
    OTHER_REASON,
  ],
};

export function OfferActionDialog({
  mode,
  onOpenChange,
  onSubmitCounter,
  onSubmitReason,
}: {
  mode: OfferActionMode | null;
  onOpenChange: (open: boolean) => void;
  onSubmitCounter: (amount: number) => void;
  onSubmitReason: (reason?: string) => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [reasonChoice, setReasonChoice] = React.useState("");
  const [customReason, setCustomReason] = React.useState("");

  const isOther = reasonChoice === OTHER_REASON;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "counter") {
      onSubmitCounter(Number(amount));
    } else {
      const reason = isOther ? customReason.trim() : reasonChoice;
      onSubmitReason(reason || undefined);
    }
    onOpenChange(false);
    setAmount("");
    setReasonChoice("");
    setCustomReason("");
  }

  return (
    <Dialog open={!!mode} onOpenChange={onOpenChange}>
      <DialogContent>
        {mode && (
          <>
            <DialogHeader>
              <DialogTitle>{COPY[mode].title}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "counter" ? (
                <div className="space-y-2">
                  <Label htmlFor="counter-amount">Counter offer amount (KES)</Label>
                  <Input
                    id="counter-amount"
                    type="number"
                    min={0}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (optional)</Label>
                    <Select value={reasonChoice} onValueChange={setReasonChoice}>
                      <SelectTrigger id="reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_REASONS[mode].map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isOther && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-reason">Specify reason</Label>
                      <Textarea
                        id="custom-reason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button type="submit" className="bg-penda-teal hover:bg-penda-teal-dark">
                  {COPY[mode].cta}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
