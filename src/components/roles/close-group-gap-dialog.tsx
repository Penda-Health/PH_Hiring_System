"use client";

import * as React from "react";
import { Branch } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * Prompted instead of the plain HC Filled "+" step whenever that step
 * would apply to a group role (see useRoleEditState.isGroupRole) — closing
 * a gap on a role shared across several branches needs to know *which*
 * branch it was for, so that branch's seat can be split out into its own
 * closed role rather than just anonymously bumping a shared counter.
 */
export function CloseGroupGapDialog({
  open,
  onOpenChange,
  branches,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  onConfirm: (branchId: string, amount: number) => void;
}) {
  const [branchId, setBranchId] = React.useState("");
  const [amount, setAmount] = React.useState(1);

  React.useEffect(() => {
    if (open) {
      setBranchId("");
      setAmount(1);
    }
  }, [open]);

  const selected = branches.find((b) => b.id === branchId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" allowOutsideClose>
        <DialogHeader>
          <DialogTitle>Which branch is this seat for?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch…" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Headcount closed</Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This carves {selected ? selected.name : "the branch"}&apos;s seat out into its own closed (Filled) role,
            and reduces this group role&apos;s approved headcount by the same amount.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!branchId || amount <= 0}
            onClick={() => {
              onConfirm(branchId, amount);
              onOpenChange(false);
            }}
            className="bg-penda-blue hover:bg-penda-blue-dark text-white"
          >
            Close gap &amp; split role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
