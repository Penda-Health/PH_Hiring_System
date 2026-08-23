"use client";

import * as React from "react";
import { Branch, Requisition, RequisitionType, Segment, Priority, GapReason } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { departmentOptionsFor } from "@/lib/department-options";

const REQ_TYPES: RequisitionType[] = ["SO New Role", "SO Replacement", "IPS Gap"];
const SEGMENTS: Segment[] = ["IPS", "SO"];
const URGENCIES: Priority[] = ["Critical", "High", "Medium", "Low"];
const GAP_REASONS: GapReason[] = ["Transfer", "Promotion", "Voluntary Resignation", "Termination", "New Addition"];

// Every requisition type maps to exactly one segment today (there's no "IPS
// New Role" type) — Segment is derived from Type rather than picked
// independently, so the two can never disagree.
function segmentForType(type: RequisitionType): Segment {
  return type === "IPS Gap" ? "IPS" : "SO";
}

export function NewRequisitionDialog({
  onCreate,
  submittedBy,
  branches,
}: {
  onCreate: (req: Requisition) => Promise<Requisition>;
  submittedBy: string;
  branches: Branch[];
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const initialType: RequisitionType = "IPS Gap";
  const initialSegment = segmentForType(initialType);
  const [form, setForm] = React.useState<{
    type: RequisitionType;
    roleTitle: string;
    department: string;
    segment: Segment;
    gapReason: GapReason;
    branchId: string;
    headcount: number;
    justification: string;
    urgency: Priority;
    jdAttached: boolean;
    expectedStartDate: string;
  }>({
    type: initialType,
    roleTitle: "",
    department: "",
    segment: initialSegment,
    gapReason: "New Addition" as GapReason,
    branchId: branches.find((b) => b.segment === initialSegment)?.id ?? branches[0]?.id ?? "",
    headcount: 1,
    justification: "",
    urgency: "Medium" as Priority,
    jdAttached: false,
    expectedStartDate: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const departmentOptions = departmentOptionsFor(form.segment);
  const branchOptions = branches.filter((b) => b.segment === form.segment);

  // Type fully determines Segment (see segmentForType) — changing the
  // requisition type keeps Segment, Department, and Branch in sync so they
  // can never end up pointing at the wrong side of the business.
  function updateType(type: RequisitionType) {
    const segment = segmentForType(type);
    setForm((prev) => {
      if (segment === prev.segment) return { ...prev, type };
      return {
        ...prev,
        type,
        segment,
        department: "",
        branchId: branches.find((b) => b.segment === segment)?.id ?? "",
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const req: Requisition = {
      id: `req-${Date.now()}`,
      reqId: "", // assigned by the server on create
      type: form.type,
      roleTitle: form.roleTitle,
      department: form.department,
      segment: form.segment,
      gapReason: form.type === "IPS Gap" ? form.gapReason : undefined,
      branchId: form.branchId,
      headcount: form.headcount,
      justification: form.justification,
      urgency: form.urgency,
      jdAttached: form.jdAttached,
      status: "Pending Approval",
      approverChain: ["Mash", "Mwihaki"],
      currentApproverIndex: 0,
      submittedBy,
      submittedAt: new Date().toISOString(),
      expectedStartDate: form.expectedStartDate || undefined,
    };
    setSubmitting(true);
    try {
      await onCreate(req);
      setOpen(false);
      setForm((prev) => ({ ...prev, roleTitle: "", department: "", justification: "" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-penda-blue hover:bg-penda-blue-dark">New Requisition</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Requisition</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Requisition Type">
              <Select value={form.type} onValueChange={(v) => updateType(v as RequisitionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQ_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Segment">
              {/* Derived from Requisition Type (see segmentForType) — locked
                  so it can't drift out of sync with it. */}
              <Select value={form.segment} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Role Title">
              <Input value={form.roleTitle} onChange={(e) => update("roleTitle", e.target.value)} required />
            </Field>
            <Field label="Department">
              <Select value={form.department || undefined} onValueChange={(v) => update("department", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={form.segment === "SO" ? "Select a department" : "Select a function"} />
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Branch">
              <Select value={form.branchId} onValueChange={(v) => update("branchId", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branchOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Headcount">
              <Input
                type="number"
                min={1}
                value={form.headcount}
                onChange={(e) => update("headcount", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Urgency">
              <Select value={form.urgency} onValueChange={(v) => update("urgency", v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCIES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {form.type === "IPS Gap" && (
            <Field label="Gap Reason">
              <Select value={form.gapReason} onValueChange={(v) => update("gapReason", v as GapReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GAP_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Justification">
            <Textarea
              value={form.justification}
              onChange={(e) => update("justification", e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Expected Start Date">
              <Input
                type="date"
                value={form.expectedStartDate}
                onChange={(e) => update("expectedStartDate", e.target.value)}
              />
            </Field>
            <Field label="Job Description Attached">
              <label className="flex items-center gap-2 h-10 text-sm">
                <input
                  type="checkbox"
                  checked={form.jdAttached}
                  onChange={(e) => update("jdAttached", e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                JD ready to attach
              </label>
            </Field>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-blue hover:bg-penda-blue-dark">
              {submitting ? "Submitting…" : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
