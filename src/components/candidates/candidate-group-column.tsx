import { Candidate } from "@/types";
import { CandidateCard } from "@/components/pipeline/candidate-card";

export function CandidateGroupColumn({
  label,
  candidates,
  onSelectCandidate,
}: {
  label: string;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
}) {
  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="flex items-center justify-between px-2 py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {candidates.length}
        </span>
      </div>
      <div className="space-y-2 px-1">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onClick={() => onSelectCandidate(candidate)}
          />
        ))}
        {candidates.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">No candidates</p>
        )}
      </div>
    </div>
  );
}
