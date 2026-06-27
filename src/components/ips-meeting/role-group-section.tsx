import { Branch, Candidate, OpenRole } from "@/types";
import { IpsAllocation } from "@/lib/supabase/ips-meetings";
import { AllocationCard } from "@/components/ips-meeting/allocation-card";

export function AllocationSection({
  title,
  allocations,
  roleById,
  branchById,
  candidates,
  openRoles,
  canEdit,
  onCandidateChange,
  onNoteChange,
}: {
  title: string;
  allocations: IpsAllocation[];
  roleById: Map<string, OpenRole>;
  branchById: Map<string, Branch>;
  candidates: Candidate[];
  openRoles: OpenRole[];
  canEdit: boolean;
  onCandidateChange: (allocationId: string, candidateId: string | null) => void;
  onNoteChange: (allocationId: string, note: string) => void;
}) {
  if (allocations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allocations.map((allocation) => (
          <AllocationCard
            key={allocation.id}
            allocation={allocation}
            role={roleById.get(allocation.openRoleId)}
            branch={branchById.get(allocation.branchId)}
            candidates={candidates}
            openRoles={openRoles}
            canEdit={canEdit}
            onCandidateChange={(candidateId) => onCandidateChange(allocation.id, candidateId)}
            onNoteChange={(note) => onNoteChange(allocation.id, note)}
          />
        ))}
      </div>
    </div>
  );
}
