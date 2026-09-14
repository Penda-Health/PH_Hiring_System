import { cn } from "@/lib/utils";

type ChoiceOption<T extends string> = T | { value: T; label: string };

function normalize<T extends string>(opt: ChoiceOption<T>): { value: T; label: string } {
  return typeof opt === "string" ? { value: opt, label: opt } : opt;
}

/**
 * Single-select row of rounded pill buttons — the design canvas's recurring
 * choice pattern (would-rehire, feedback response, honesty/compliance/
 * license, recommend-hire). Pass plain strings when the display label and
 * the submitted value are the same; pass `{ value, label }` when the canvas
 * copy's casing differs from the stored enum value (e.g. recommendHire).
 */
export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: readonly ChoiceOption<T>[];
  value: T | "";
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((raw) => {
        const opt = normalize(raw);
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border font-semibold transition-colors",
              size === "sm" ? "px-3.5 py-2 text-[13px]" : "px-4 py-2.5 text-[13.5px]",
              selected
                ? "border-penda-blue bg-penda-blue-light text-penda-blue"
                : "border-[#e4e7ec] text-[#475467] hover:border-penda-blue/40"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
