import Image from "next/image";
import { RefereeStepper } from "./stepper";

// Slim top bar shown on every wizard screen (verify through recommendation):
// the actual Penda Health logo (public/assets/logo.webp — the same asset the
// dashboard's own Logo component uses, wordmark baked in, so no separate
// text label is needed) on the left, a short "who this is for" context line,
// and the step indicator on the right — per Verify.dc.html /
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
        <Image
          src="/assets/logo.webp"
          alt="Penda Health"
          width={200}
          height={80}
          className="h-8 w-auto shrink-0 object-contain"
        />
        <span className="hidden truncate text-[13px] text-[#98a2b3] sm:ml-0.5 sm:inline">
          · Reference check for {candidateName}
        </span>
      </div>
      <RefereeStepper currentStep={step} totalSteps={totalSteps} />
    </div>
  );
}
