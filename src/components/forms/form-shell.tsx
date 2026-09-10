import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormShellStat {
  value: string;
  label: string;
}

export interface FormShellBrand {
  /** Small uppercase label above the headline. Defaults to "Penda Health · Careers". */
  eyebrow?: string;
  /** The panel's one big statement — what this specific link is for. */
  headline: string;
  /** One supporting sentence under the headline. */
  lede?: string;
  /** Up to 2 short stats (e.g. "9–5" / "Full day"). Hidden on narrow screens. */
  stats?: FormShellStat[];
  /** Short "what to expect"-style detail under the stats. Hidden on narrow screens. */
  note?: string;
  /** Small closing line under the stats, e.g. branch cities or a contact address. */
  footer?: string;
}

const DEFAULT_BRAND: FormShellBrand = {
  eyebrow: "Penda Health · Careers",
  headline: "Thank you for being part of how we hire.",
  lede: "This link is part of Penda Health's hiring process — we appreciate the time.",
};

/** The hands + heart mark, in the brand's blue-panel-safe colors — no background. */
function PendaMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M30 56 C18 54, 6 42, 8 20 C9 13, 14 10, 18 15 C23 21, 25 32, 28 40 C29 44, 30 50, 30 56 Z"
        fill="#FFFFFF"
      />
      <path
        d="M34 56 C46 54, 58 42, 56 20 C55 13, 50 10, 46 15 C41 21, 39 32, 36 40 C35 44, 34 50, 34 56 Z"
        fill="#FFFFFF"
      />
      <path
        d="M32 38 C26 33, 19 28, 19 21 C19 15, 24 12, 28 16 C30 18, 31 19, 32 21 C33 19, 34 18, 36 16 C40 12, 45 15, 45 21 C45 28, 38 33, 32 38 Z"
        fill="#F15BA6"
      />
    </svg>
  );
}

/**
 * Shared wrapper for every public, no-login form (work-trial, work-trial-request,
 * bm-feedback, referee, requisition-request, confirm-employment). Split-panel
 * layout: a brand panel carrying the real logo and page-specific context on the
 * left, the working form on the right. Stacks on narrow screens, with the brand
 * panel collapsing to a compact top band (stats/footer drop to save space).
 *
 * `brand` is optional per call site, but every FormShell rendered by the same
 * page should pass the same brand content (loading/error/success states
 * included) so the left panel doesn't change context as the page's state
 * changes underneath it.
 */
export function FormShell({
  title,
  subtitle,
  brand,
  children,
}: {
  /** Omit for a status-only screen (loading/success/error) whose `children` is a FormStatusCard — avoids a duplicate heading above the card's own. */
  title?: string;
  subtitle?: string;
  brand?: FormShellBrand;
  children: React.ReactNode;
}) {
  const b = { ...DEFAULT_BRAND, ...brand };

  return (
    <div className="light min-h-screen grid grid-cols-1 md:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)] bg-background px-0 md:px-[15px] text-foreground">
      <div className="relative overflow-hidden bg-gradient-to-br from-penda-blue via-[#1442D6] to-penda-blue-dark px-6 py-8 sm:px-10 md:py-14 lg:py-16 flex flex-col text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #FFFFFF 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-penda-pink/30 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 -left-10 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-1 flex-col">
          <div className="inline-flex items-center gap-2.5">
            <PendaMark />
            <span className="text-lg font-extrabold tracking-tight">Penda Health</span>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <div className="max-w-sm py-8 md:py-10">
              {b.eyebrow && (
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-penda-blue-light/90">
                  {b.eyebrow}
                </p>
              )}
              <p className="text-2xl font-bold leading-tight tracking-tight text-balance sm:text-[28px]">
                {b.headline}
              </p>
              {b.lede && <p className="mt-3 text-sm leading-relaxed text-white/80">{b.lede}</p>}

              {b.stats && b.stats.length > 0 && (
                <div className="mt-8 hidden gap-6 md:flex">
                  {b.stats.map((s) => (
                    <div key={s.label}>
                      <div className="text-xl font-extrabold tabular-nums">{s.value}</div>
                      <div className="mt-0.5 text-xs text-white/70">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {b.note && (
                <p className="mt-6 hidden text-xs leading-relaxed text-white/70 md:block">
                  <span className="font-semibold text-white/90">What to expect: </span>
                  {b.note}
                </p>
              )}
            </div>
          </div>
        </div>

        {b.footer && (
          <p className="relative mt-10 hidden border-t border-white/15 pt-5 text-xs text-white/60 md:block">
            {b.footer}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8 sm:py-14">
        <div className="w-full max-w-lg">
          {title && <h1 className="text-2xl font-bold text-balance text-foreground">{title}</h1>}
          {title && subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
          <div className={title ? "mt-6" : undefined}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function FormMessage({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-sm text-foreground/90">{children}</div>;
}

// ---------------------------------------------------------------------------
// Status screens — the shared "this is where the flow ends" treatment for
// every public form: expired/invalid link, a submit failure, "you already
// did this", and the final thank-you. Previously each page rendered these as
// bare paragraphs under a plain <h1>, which read as unfinished next to the
// branded panel beside it. One icon+card component now covers all of them
// consistently across every FormShell caller (referee, work-trial,
// bm-feedback, requisition-request, confirm-employment, …).
// ---------------------------------------------------------------------------

export type FormStatusVariant = "loading" | "success" | "info" | "warning" | "error";

const STATUS_ICON: Record<FormStatusVariant, React.ComponentType<{ className?: string }>> = {
  loading: Loader2,
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
};

const STATUS_TONE: Record<FormStatusVariant, string> = {
  loading: "bg-muted text-muted-foreground",
  success: "bg-success-bg text-success-fg",
  info: "bg-penda-blue-light text-penda-blue-dark",
  warning: "bg-high-bg text-high-fg",
  error: "bg-critical-bg text-critical-fg",
};

export function FormStatusIcon({ variant, className }: { variant: FormStatusVariant; className?: string }) {
  const Icon = STATUS_ICON[variant];
  return (
    <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", STATUS_TONE[variant], className)}>
      <Icon className={cn("h-6 w-6", variant === "loading" && "animate-spin")} />
    </div>
  );
}

/**
 * A self-contained status screen: icon, heading, optional subtitle, and a
 * message body — meant to be the sole child of a FormShell called *without*
 * `title` (so there's no duplicate heading above it). Use FormMessage-style
 * children for the body when it needs links/formatting, or a plain string
 * for the common case.
 */
export function FormStatusCard({
  variant,
  title,
  subtitle,
  children,
}: {
  variant: FormStatusVariant;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-7">
      <FormStatusIcon variant={variant} />
      <h1 className="mt-4 text-xl font-bold text-balance text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      {children && <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90">{children}</div>}
    </div>
  );
}

/**
 * Compact numbered-step indicator for multi-step public forms (currently
 * just /referee's verify → answer flow, written generically in case another
 * form grows a second step later).
 */
export function FormStepper({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={cn(
              "h-1.5 w-6 rounded-full transition-colors",
              n <= step ? "bg-penda-blue" : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Step {step} of {total} — {label}
      </p>
    </div>
  );
}
