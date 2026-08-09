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
  title: string;
  subtitle?: string;
  brand?: FormShellBrand;
  children: React.ReactNode;
}) {
  const b = { ...DEFAULT_BRAND, ...brand };

  return (
    <div className="light min-h-screen grid grid-cols-1 md:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)] bg-background px-0 md:px-[15px] text-foreground">
      <div className="relative overflow-hidden bg-gradient-to-br from-penda-blue via-[#1442D6] to-penda-blue-dark px-6 py-8 sm:px-10 md:py-14 lg:py-16 flex flex-col text-white">
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
          <h1 className="text-2xl font-bold text-balance text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function FormMessage({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-sm text-foreground/90">{children}</div>;
}
