"use client";

import { Candidate } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getRoleForCandidate, daysInStage } from "@/lib/pipeline-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

export function CandidateDetailDialog({
  candidate,
  onOpenChange,
}: {
  candidate: Candidate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { openRoles } = useRecruitmentData();
  const role = candidate ? getRoleForCandidate(candidate, openRoles) : undefined;

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent>
        {candidate && (
          <>
            <DialogHeader>
              <DialogTitle>{candidate.name}</DialogTitle>
              <DialogDescription>
                {role?.title ?? "Unknown role"} · {candidate.stage}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              {role && <Badge variant={role.segment === "IPS" ? "ips" : "so"}>{role.segment}</Badge>}
              {role && (
                <Badge variant={role.priority === "Critical" ? "critical" : role.priority === "High" ? "high" : "outline"}>
                  {role.priority}
                </Badge>
              )}
              <Badge variant="outline">{daysInStage(candidate.stageEnteredAt)} days in stage</Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Phone" value={candidate.phone} />
              <Field label="Email" value={candidate.email} />
              <Field label="Source" value={candidate.source} />
              <Field label="Gender" value={candidate.gender} />
              <Field label="Employment Type" value={candidate.employmentType} />
              <Field label="Applied" value={new Date(candidate.createdAt).toLocaleDateString()} />
            </div>

            {(candidate.referee1 || candidate.referee2) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Referees</p>
                  {candidate.referee1 && (
                    <p className="text-sm">{candidate.referee1.name} — {candidate.referee1.phone}</p>
                  )}
                  {candidate.referee2 && (
                    <p className="text-sm">{candidate.referee2.name} — {candidate.referee2.phone}</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
