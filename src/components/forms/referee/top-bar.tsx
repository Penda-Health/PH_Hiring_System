import { PendaMark } from "@/components/forms/form-shell";
import { RefereeStepper } from "./stepper";

// Slim top bar shown on every wizard screen (verify through recommendation):
// the real Penda mark + wordmark on the left, a short "who this is for"
// context line, and the step indicator on the right — per Verify.dc.html /
// RelationshipRatings.dc.html / FeedbackCharacter.dc.html / Recommendation.dc.html.
export function RefereeTopBar({
  candidateName,
  step,
  totalSteps,
}: {
  candidateName: string;
  step: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#eef0f3] px-5 py-5 sm:px-16">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef2ff]">
          <PendaMark variant="light" size={17} />
        </span>
        <span className="shrink-0 text-[15px] font-extrabold text-[#101828]">PENDA HEALTH</span>
        <span className="hidden truncate text-[13px] text-[#98a2b3] sm:ml-0.5 sm:inline">
          · Reference check for {candidateName}
        </span>
      </div>
      <RefereeStepper currentStep={step} totalSteps={totalSteps} />
    </div>
  );
}
