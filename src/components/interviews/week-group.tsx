import { Interview } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterviewRow } from "./interview-row";

export function WeekGroup({
  weekLabel,
  interviews,
  onUpdate,
  onSelectCandidate,
}: {
  weekLabel: string;
  interviews: Interview[];
  onUpdate: (id: string, patch: Partial<Interview>) => void;
  onSelectCandidate: (candidateId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{weekLabel}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
          <div className="col-span-2">Date</div>
          <div className="col-span-3">Candidate</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Attendance</div>
          <div className="col-span-2">Outcome</div>
        </div>
        {interviews.map((interview) => (
          <InterviewRow
            key={interview.id}
            interview={interview}
            onUpdate={onUpdate}
            onSelectCandidate={onSelectCandidate}
          />
        ))}
      </CardContent>
    </Card>
  );
}
