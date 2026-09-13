import { cn } from "@/lib/utils";

const END_LABELS: Record<number, string> = { 1: "Poor", 5: "Exceptional" };

/** The 5-segment 1-5 rating bar from FeedbackCharacter.dc.html (Execution/Teamwork/Communication). */
export function RatingScale({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="mb-4 flex overflow-hidden rounded-[9px] border border-[#e4e7ec]" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        const label = END_LABELS[n];
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(n)}
            className={cn(
              "flex-1 border-r border-[#e4e7ec] py-2.5 text-center text-[10.5px] leading-tight last:border-r-0",
              selected ? "bg-penda-blue-light font-bold text-penda-blue" : "font-semibold text-[#98a2b3]"
            )}
          >
            {n}
            {label && (
              <>
                <br />
                {label}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
