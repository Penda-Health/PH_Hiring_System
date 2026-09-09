import { LegalPageShell } from "@/components/forms/legal-page-shell";

export const metadata = { title: "Privacy Policy — Penda Health Hiring" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" effectiveDate="9 September 2026">
      <p>
        Penda Health (&ldquo;Penda Health&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) uses this hiring platform to run
        our recruitment process — reviewing candidates, coordinating interviews and work trials, checking
        references, and confirming offers of employment. This policy explains what information the platform
        collects, why, and how it&rsquo;s protected. It applies to job candidates, the referees they name, branch
        managers, and Penda Health staff who use the platform.
      </p>

      <h2>Information we collect</h2>
      <p>Depending on which part of the hiring process you&rsquo;re part of, we collect:</p>
      <ul>
        <li>
          <strong>Candidates:</strong> name, contact details, application and interview materials, work-trial
          scores and feedback, and offer details.
        </li>
        <li>
          <strong>Referees:</strong> name, email, phone number, your relationship to the candidate, and the
          feedback you provide about them. When you verify your identity with &ldquo;Sign in with Google&rdquo; on
          a reference-check link, we receive only your Google account&rsquo;s name and email address — solely to
          confirm you&rsquo;re the person the candidate named as a reference. We never request or receive access
          to your inbox, contacts, calendar, files, or anything else in your Google account.
        </li>
        <li>
          <strong>Branch managers:</strong> the feedback you submit on a candidate&rsquo;s work trial.
        </li>
        <li>
          <strong>Penda Health staff:</strong> your work email and basic Google profile (name, photo) used to
          sign in to the internal system, which is restricted to @penda.co.ke and @pendahealth.com accounts.
        </li>
      </ul>

      <h2>How we use this information</h2>
      <p>
        Information collected through this platform is used solely for the purpose of Penda Health&rsquo;s hiring
        process: evaluating candidates, verifying references, coordinating with candidates and referees, and
        keeping an internal record of hiring decisions. It is not used for advertising, and it is not sold to
        anyone.
      </p>

      <h2>Confidentiality</h2>
      <p>
        Information submitted through this platform — including reference feedback, work-trial scores, and
        interview notes — is treated as confidential. It is accessible only to authorized Penda Health
        recruitment staff who need it to do their job, and is not shared outside Penda Health except with the
        service providers below, each of whom is bound to protect it and use it only to help operate this
        platform:
      </p>
      <ul>
        <li>
          <strong>Airtable</strong> — where hiring records are stored.
        </li>
        <li>
          <strong>Google</strong> — for staff sign-in and for verifying a referee&rsquo;s identity, as described
          above.
        </li>
        <li>
          <strong>Supabase and Vercel</strong> — for authenticating staff and hosting the platform.
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        We keep hiring records for as long as reasonably necessary for the hiring process and our internal
        recordkeeping. You can ask us about, correct, or request deletion of your information at any time — see
        Contact below — subject to any legitimate recordkeeping we&rsquo;re required to retain.
      </p>

      <h2>Security</h2>
      <p>
        All traffic to this platform is encrypted (HTTPS). Access to hiring records is restricted to signed-in,
        authorized staff, and every public form (work trial, reference check, offer confirmation) is reachable
        only through a unique, time-limited link rather than a public login.
      </p>

      <h2>Children</h2>
      <p>
        This platform is part of an employment process and is not directed at, or knowingly used by, children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the hiring process evolves. The effective date at the top of this page
        reflects the most recent revision.
      </p>
    </LegalPageShell>
  );
}
