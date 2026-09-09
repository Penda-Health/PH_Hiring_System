import { LegalPageShell } from "@/components/forms/legal-page-shell";

export const metadata = { title: "Terms of Service — Penda Health Hiring" };

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" effectiveDate="9 September 2026">
      <p>
        This platform is used by Penda Health to run its recruitment and hiring process. By opening a link sent
        to you as part of that process — a work trial, a reference check, a requisition request, or an offer
        confirmation — or by signing in as Penda Health staff, you agree to these terms.
      </p>

      <h2>Purpose</h2>
      <p>
        This platform exists solely to support Penda Health&rsquo;s hiring process: reviewing candidates,
        scheduling and scoring work trials, collecting reference feedback, and confirming offers. It is not a
        general-purpose service, and links sent through it are not intended for any other use.
      </p>

      <h2>Your link is personal</h2>
      <p>
        Public links (for work trials, reference checks, requisition requests, and offer confirmations) are
        generated for a specific person and are time-limited. Please don&rsquo;t forward or share your link —
        anyone using it is treated as acting on your behalf.
      </p>

      <h2>Accuracy</h2>
      <p>
        You agree that any information you submit through this platform — as a candidate, a referee, or a
        branch manager — is accurate and given in good faith.
      </p>

      <h2>Signing in with Google</h2>
      <p>
        Where the platform offers &ldquo;Sign in with Google&rdquo; — to verify a referee&rsquo;s identity, or for
        Penda Health staff to access the internal system — that sign-in is also subject to Google&rsquo;s own
        Terms of Service and Privacy Policy. See our <a href="/privacy-policy" className="text-penda-blue hover:underline">Privacy Policy</a>{" "}
        for exactly what information we receive from Google and how we use it.
      </p>

      <h2>No guarantee of employment</h2>
      <p>
        Completing a work trial, providing a reference, or otherwise participating in this process does not
        guarantee an offer of employment or continued employment with Penda Health.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to misuse this platform — including attempting to access another person&rsquo;s link or
        records, submitting false information, or using the platform for anything unrelated to Penda
        Health&rsquo;s hiring process.
      </p>

      <h2>Liability</h2>
      <p>
        This platform is provided as an internal hiring tool, on an &ldquo;as is&rdquo; basis. Penda Health is
        not liable for indirect or incidental issues arising from its use, to the extent permitted by law.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Kenya.</p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as the hiring process evolves. The effective date at the top of this page
        reflects the most recent revision.
      </p>
    </LegalPageShell>
  );
}
