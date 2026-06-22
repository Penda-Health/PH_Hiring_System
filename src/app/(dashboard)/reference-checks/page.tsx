"use client";

import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { ReferenceCheckCard } from "@/components/reference-checks/reference-check-card";

export default function ReferenceChecksPage() {
  const { referenceChecks, updateReferenceCheckOutcome } = useRecruitmentData();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reference Checks</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {referenceChecks.map((check) => (
          <ReferenceCheckCard key={check.id} refCheck={check} onUpdateOutcome={updateReferenceCheckOutcome} />
        ))}
      </div>
    </div>
  );
}
