"use client";

import { Interview, AttendanceStatus, InterviewOutcome } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCandidateForInterview, getRoleForInterview } from "@/lib/interview-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ["Pending", "Attended", "No-show"];
const OUTCOME_OPTIONS: InterviewOutcome[] = ["Pending", "Pass", "Fail"];

export function InterviewRow({
  interview,
  onUpdate,
  onSelectCandidate,
}: {
  interview: Interview;
  onUpdate: (id: string, patch: Partial<Interview>) => void;
  onSelectCandidate: (candidateId: string) => void;
}) {
  const { candidates, openRoles } = useRecruitmentData();
  const candidate = getCandidateForInterview(interview, candidates);
  const role = getRoleForInterview(interview, openRoles);

  return (
    <div className="grid grid-cols-12 gap-3 items-center px-3 py-2 border-b border-border text-sm">
      <div className="col-span-2 text-muted-foreground">
        {new Date(interview.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {interview.time}
      </div>
      <button
        className="col-span-3 text-left font-medium hover:text-penda-teal truncate"
        onClick={() => candidate && onSelectCandidate(candidate.id)}
      >
        {candidate?.name ?? "Unknown"}
      </button>
      <div className="col-span-2 text-muted-foreground truncate">{role?.title ?? "—"}</div>
      <div className="col-span-1">
        <Badge variant="outline">{interview.type}</Badge>
      </div>
      <div className="col-span-2">
        <Select
          value={interview.attendance}
          onValueChange={(v) => onUpdate(interview.id, { attendance: v as AttendanceStatus })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTENDANCE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Select
          value={interview.outcome}
          onValueChange={(v) => onUpdate(interview.id, { outcome: v as InterviewOutcome })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
