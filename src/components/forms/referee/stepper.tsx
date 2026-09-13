import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Visual port of the design canvas's "Stepper" artboard: a filled, checked
// circle for each completed step, a filled numbered circle for the current
// one, and an outlined numbered circle for steps still ahead, joined by a
// connecting line that fills in as steps complete.
export function RefereeStepper({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center" aria-hidden="true">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => {
        const done = n < currentStep;
        const isCurrent = n === currentStep;
        const active = done || isCurrent;
        return (
          <div key={n} className="flex items-center">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                active ? "border-[#2f5fe0] bg-[#2f5fe0]" : "border-[#e4e7ec] bg-white"
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              ) : (
                <span className={cn("text-xs font-bold", isCurrent ? "text-white" : "text-[#98a2b3]")}>{n}</span>
              )}
            </div>
            {n !== totalSteps && <div className={cn("h-0.5 w-[30px] sm:w-[46px]", done ? "bg-[#2f5fe0]" : "bg-[#e4e7ec]")} />}
          </div>
        );
      })}
    </div>
  );
}
