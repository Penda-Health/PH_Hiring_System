import Image from "next/image";
import Link from "next/link";

/**
 * Shared chrome for standalone legal pages (privacy policy, terms of
 * service). These exist to satisfy the "Application home page" / "Privacy
 * policy link" / "Terms of service link" fields Google's OAuth consent
 * screen asks for (see SETUP.md §2) — required before the app's OAuth
 * client can move to External/production, which referee Google
 * verification depends on (§4.5). Deliberately not FormShell: that
 * component's split blue-panel layout is built for a short interactive
 * form, not a long document — this just needs a plain, readable page.
 */
export function LegalPageShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <div className="light min-h-screen bg-penda-bg text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-6 py-5">
          <Image src="/assets/logo.webp" alt="Penda Health" width={28} height={28} className="shrink-0" />
          <Link href="/" className="text-base font-extrabold tracking-tight text-penda-charcoal">
            Penda Health
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-penda-blue">Penda Health · Hiring</p>
        <h1 className="mt-2 text-2xl font-bold text-balance text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Effective {effectiveDate}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:first:mt-0 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          Questions about this {title.toLowerCase()}? Contact{" "}
          <a href="mailto:careers@pendahealth.com" className="font-medium text-penda-blue hover:underline">
            careers@pendahealth.com
          </a>
          .
        </p>
      </main>
    </div>
  );
}
