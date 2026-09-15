"use client";

// Rebuilt to match the design canvas the user supplied (7 artboards: Main,
// Verify, RelationshipRatings, FeedbackCharacter, Recommendation, ThankYou,
// Stepper) "exactly the same" — a distinct, self-contained visual system
// local to this one form (not the shared FormShell other public forms use),
// down to the exact copy and layout of each screen. Two deliberate
// departures from the canvas, per explicit user feedback on the rendered
// page: (1) the canvas's generic circle+heart-path icon is replaced
// everywhere with the actual Penda Health logo (public/assets/logo.webp —
// same asset the dashboard's own Logo component uses), and (2) the canvas's
// literal accent blue/purple palette is replaced with Penda's real brand
// tokens (`penda-blue` etc., tailwind.config.ts) and FormShell's existing
// blue-only hero gradient, instead of the canvas's own invented hex values.
import * as React from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Loader2, AlertTriangle, Info, CheckCircle2, Lock, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleSignInButton } from "@/components/forms/google-sign-in-button";
import { RefereeTopBar } from "@/components/forms/referee/top-bar";
import { ChoiceGroup } from "@/components/forms/referee/choice-group";
import { RatingScale } from "@/components/forms/referee/rating-scale";
import { DraftRestoredBanner } from "@/components/forms/form-shell";
import { loadDraft, saveDraft, clearDraft } from "@/lib/forms/referee-draft";

type FormData = {
  candidateName: string;
  roleTitle: string;
  recruiterName: string;
  segment: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone: string;
  alreadySubmitted: boolean;
  googleVerified: boolean;
};

const RELATIONSHIPS = ["Direct manager / supervisor", "Senior colleague", "Peer / colleague", "Client or patient", "Other professional"];
const REPORTING_RELATIONSHIPS = [
  "Reported directly to me",
  "Reported to someone else, but I worked closely with them",
  "We were peers / colleagues",
  "I reported to them",
] as const;
const DURATIONS = ["Less than 1 year", "1 – 2 years", "2 – 5 years", "5+ years"];
const INTERACTION_FREQUENCIES = ["Daily", "A few times a week", "Weekly", "A few times a month", "Rarely"] as const;
const LEAVING_REASONS = ["Still employed there", "Resigned", "Contract ended", "Laid off / restructuring", "Terminated", "Not sure"] as const;
const WOULD_REHIRE_OPTIONS = ["Yes", "With reservations", "No"] as const;
const FEEDBACK_RESPONSE_OPTIONS = ["Openly, and applied it", "Mixed", "Defensively"] as const;
const HONESTY_OPTIONS = ["No concerns", "Some concerns", "Prefer to discuss by phone"] as const;
const COMPLIANCE_OPTIONS = ["None that I know of", "Yes", "Prefer to discuss by phone"] as const;
const LICENSE_OPTIONS = ["Yes", "No", "N/A", "Not sure"] as const;
const RECOMMEND_HIRE_OPTIONS = [
  { value: "Strongly Recommend", label: "Strongly recommend" },
  { value: "Recommend", label: "Recommend" },
  { value: "Recommend with Reservations", label: "Recommend with reservations" },
  { value: "Do Not Recommend", label: "Do not recommend" },
] as const;

const PREFERS_PHONE = "Prefer to discuss by phone";
const MIN_EXAMPLE_LENGTH = 100;
const MIN_TEXT_LENGTH = 10;
const MIN_COACHING_LENGTH = 50;
const MIN_RESPONSIBILITIES_LENGTH = 50;

// The "employment dates you recall" fields are <input type="month"> pickers,
// which read/write "YYYY-MM" — the live Airtable columns behind them
// (Referee N Employment From/To) are real `date` fields, so submit a real
// ISO date (first of the picked month) rather than a human string like
// "Mar 2023", which Airtable's date typecast can't reliably parse and was
// causing the whole submission to fail with a 500. Reformatted back to
// "Mon YYYY" for display in the PDF report (see reference-check-report-pdf.ts).
function monthToIsoDate(monthValue: string): string {
  return `${monthValue}-01`;
}

// Caps the employment-dates month pickers so a referee can't pick a future
// month for a job that (by definition) already started.
const now = new Date();
const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

// ---------------------------------------------------------------------------
// Small styled primitives shared by every wizard screen below — plain HTML
// controls (or the existing Input/Select) restyled to the canvas's look:
// #e4e7ec borders, 10px radius, 13.5px text, #344054 labels.
// ---------------------------------------------------------------------------

// Explicit bg-white + text-[#101828] here (not left to the shared Input/
// SelectTrigger's CSS-variable bg-background/text-foreground) so these
// fields always render with a white background and black text, regardless
// of the visitor's OS/browser dark-mode preference — see FormShell's own
// note on this same class of bug.
const fieldClass =
  "h-auto w-full rounded-[10px] border-[#e4e7ec] bg-white px-[13px] py-[11px] text-[13.5px] text-[#101828] placeholder:text-[#98a2b3] focus-visible:ring-penda-blue/30";
const selectTriggerClass =
  "h-auto w-full rounded-[10px] border-[#e4e7ec] bg-white px-[13px] py-[11px] text-[13.5px] text-[#101828] focus:ring-penda-blue/30 data-[placeholder]:text-[#98a2b3]";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[12.5px] font-semibold text-[#344054]">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

function TextArea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  minLength,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  minLength?: number;
}) {
  const count = value.trim().length;
  const meetsMin = minLength === undefined || count >= minLength;
  return (
    <div>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-[10px] border border-[#e4e7ec] bg-white px-3 py-3 text-[13.5px] leading-[1.55] text-[#101828] placeholder:text-[#98a2b3] focus:outline-none focus:ring-2 focus:ring-penda-blue/30"
      />
      {minLength !== undefined && (
        <p className={cn("mt-1 text-xs", meetsMin ? "text-[#98a2b3]" : "text-red-500")}>
          {count}/{minLength} characters minimum
        </p>
      )}
    </div>
  );
}

function BasicSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={selectTriggerClass}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      {/*
        Radix portals this popup to document.body by default, outside the
        page's `.light`-scoped wrapper, so the shared bg-popover/
        text-popover-foreground CSS variables it normally relies on could
        still resolve to the app's dark palette under system dark mode.
        Hardcode the popup (and each option's hover/selected state) to a
        white background with black text here so it's never theme-dependent.
      */}
      <SelectContent className="bg-white text-[#101828]">
        {options.map((opt) => (
          <SelectItem
            key={opt}
            value={opt}
            className="text-[#101828] focus:bg-penda-blue-light focus:text-penda-blue"
          >
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-[#475467] hover:text-[#101828]">
      ← Back
    </button>
  );
}

function ContinueButton({
  children = "Continue",
  disabled,
  onClick,
  type = "button",
}: {
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-[10px] bg-penda-blue px-6 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
      <ArrowRight className="h-[15px] w-[15px]" strokeWidth={2.4} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — verify. Keeps the Google Identity Services verification logic
// as-is (server re-checks it anyway — see google-verify.ts); only the
// wrapper is reskinned to match Verify.dc.html's card.
// ---------------------------------------------------------------------------
function GoogleVerificationStep({
  token,
  data,
  onVerified,
}: {
  token: string;
  data: FormData;
  onVerified: () => void;
}) {
  const [checking, setChecking] = React.useState(false);
  const [mismatch, setMismatch] = React.useState<{ googleEmail: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCredential(credential: string) {
    setChecking(true);
    setError(null);
    setMismatch(null);
    try {
      const res = await fetch("/api/public/referee/verify-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, credential }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error === "invalid_google_token" ? "Couldn't verify that Google account. Please try again." : "Something went wrong. Please try again.");
      }
      if (body.verified) {
        onVerified();
      } else {
        setMismatch({ googleEmail: body.googleEmail });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-[#e4e7ec] bg-[#f9fafb] p-8 text-center">
      <div className="mx-auto mb-[18px] flex h-11 w-11 items-center justify-center rounded-full bg-penda-blue-light">
        <Lock className="h-[22px] w-[22px] text-penda-blue" strokeWidth={2} />
      </div>
      <div className={checking ? "pointer-events-none opacity-60" : undefined}>
        <GoogleSignInButton onCredential={handleCredential} disabled={checking} />
      </div>
      {checking && <p className="mt-3 text-xs text-[#98a2b3]">Verifying…</p>}
      {mismatch && (
        <p className="mt-4 text-left text-sm leading-relaxed text-[#475467]">
          You signed in as <span className="font-semibold text-[#101828]">{mismatch.googleEmail}</span>, but we have{" "}
          <span className="font-semibold text-[#101828]">{data.refereeEmail}</span> on file for this reference. Try a
          different Google account, or email{" "}
          <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
            careers@pendahealth.com
          </a>{" "}
          if that&apos;s correct and it just doesn&apos;t match what {data.candidateName} gave us.
        </p>
      )}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <p className="mt-4 text-[12.5px] text-[#98a2b3]">We only use this to confirm your identity — we never post on your behalf.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Terminal / status screens (loading, expired link, error, already
// submitted) — the canvas only designs the success case (ThankYou.dc.html),
// so the others reuse that same minimal centered layout for consistency.
// ---------------------------------------------------------------------------
function StatusScreen({
  icon,
  iconTone = "bg-penda-blue-light text-penda-blue",
  title,
  children,
}: {
  icon: React.ReactNode;
  iconTone?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="light flex min-h-screen flex-col bg-white">
      <div className="flex items-center gap-2.5 px-5 py-6 sm:px-16">
        <Image src="/assets/logo.webp" alt="Penda Health" width={200} height={80} className="h-8 w-auto object-contain" />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-[420px] text-center">
          <div className={cn("mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full", iconTone)}>{icon}</div>
          <h1 className="mb-3 text-[28px] font-extrabold text-[#101828]">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function RefereeForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // 0 = intro/landing (not counted in the stepper), 1 = verify, 2-4 = the wizard steps.
  const [screen, setScreen] = React.useState<0 | 1 | 2 | 3 | 4>(0);

  // Step 2 — referee & employment details
  const [relationship, setRelationship] = React.useState("");
  const [reportingRelationship, setReportingRelationship] = React.useState<(typeof REPORTING_RELATIONSHIPS)[number] | "">("");
  const [refereeOrganization, setRefereeOrganization] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [durationKnown, setDurationKnown] = React.useState("");
  const [interactionFrequency, setInteractionFrequency] = React.useState<(typeof INTERACTION_FREQUENCIES)[number] | "">("");
  const [jobTitleRecalled, setJobTitleRecalled] = React.useState("");
  const [employmentFrom, setEmploymentFrom] = React.useState("");
  const [employmentTo, setEmploymentTo] = React.useState("");
  const [stillEmployed, setStillEmployed] = React.useState(false);
  const [mainResponsibilities, setMainResponsibilities] = React.useState("");
  const [reportedTo, setReportedTo] = React.useState("");
  const [leavingReason, setLeavingReason] = React.useState<(typeof LEAVING_REASONS)[number] | "">("");
  const [wouldRehire, setWouldRehire] = React.useState<(typeof WOULD_REHIRE_OPTIONS)[number] | "">("");
  const [wouldRehireExplanation, setWouldRehireExplanation] = React.useState("");

  // Step 3 — performance feedback
  const [executionScore, setExecutionScore] = React.useState(0);
  const [executionExample, setExecutionExample] = React.useState("");
  const [teamworkScore, setTeamworkScore] = React.useState(0);
  const [teamworkExample, setTeamworkExample] = React.useState("");
  const [communicationScore, setCommunicationScore] = React.useState(0);
  const [communicationExample, setCommunicationExample] = React.useState("");

  // Step 4 — strengths & recommendation
  const [topStrengths, setTopStrengths] = React.useState("");
  const [coachingArea, setCoachingArea] = React.useState("");
  const [feedbackResponse, setFeedbackResponse] = React.useState<(typeof FEEDBACK_RESPONSE_OPTIONS)[number] | "">("");
  const [honestyConcerns, setHonestyConcerns] = React.useState<(typeof HONESTY_OPTIONS)[number] | "">("");
  const [complianceIncidents, setComplianceIncidents] = React.useState<(typeof COMPLIANCE_OPTIONS)[number] | "">("");
  const [licenseStanding, setLicenseStanding] = React.useState<(typeof LICENSE_OPTIONS)[number] | "">("");
  const [preferPhoneNumber, setPreferPhoneNumber] = React.useState("");
  const [recommendHire, setRecommendHire] = React.useState<(typeof RECOMMEND_HIRE_OPTIONS)[number]["value"] | "">("");
  const [notes, setNotes] = React.useState("");
  const [consentToContact, setConsentToContact] = React.useState(true);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Whether the current in-progress state came from a restored autosave
  // draft (see referee-draft.ts) rather than a fresh start — drives the
  // "we restored your answers" banner on screens 2-4 below.
  const [draftRestored, setDraftRestored] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setLoadError("missing_token");
      return;
    }
    fetch(`/api/public/referee?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "error");
        }
        return res.json();
      })
      .then((body: FormData) => {
        setData(body);
        setPhone(body.refereePhone || "");
        if (body.alreadySubmitted) {
          clearDraft(token); // Already submitted — any local draft is stale.
          return;
        }
        // A refresh mid-flow shouldn't re-ask someone who already verified.
        // If there's an unfinished draft for this token, resume into it
        // instead of dropping back to a blank screen 2.
        if (body.googleVerified) {
          const draft = loadDraft(token);
          if (draft) {
            setRelationship(draft.relationship);
            setReportingRelationship(draft.reportingRelationship as (typeof REPORTING_RELATIONSHIPS)[number] | "");
            setRefereeOrganization(draft.refereeOrganization);
            if (draft.phone) setPhone(draft.phone);
            setDurationKnown(draft.durationKnown);
            setInteractionFrequency(draft.interactionFrequency as (typeof INTERACTION_FREQUENCIES)[number] | "");
            setJobTitleRecalled(draft.jobTitleRecalled);
            setEmploymentFrom(draft.employmentFrom);
            setEmploymentTo(draft.employmentTo);
            setStillEmployed(draft.stillEmployed);
            setMainResponsibilities(draft.mainResponsibilities);
            setReportedTo(draft.reportedTo);
            setLeavingReason(draft.leavingReason as (typeof LEAVING_REASONS)[number] | "");
            setWouldRehire(draft.wouldRehire as (typeof WOULD_REHIRE_OPTIONS)[number] | "");
            setWouldRehireExplanation(draft.wouldRehireExplanation);
            setExecutionScore(draft.executionScore);
            setExecutionExample(draft.executionExample);
            setTeamworkScore(draft.teamworkScore);
            setTeamworkExample(draft.teamworkExample);
            setCommunicationScore(draft.communicationScore);
            setCommunicationExample(draft.communicationExample);
            setTopStrengths(draft.topStrengths);
            setCoachingArea(draft.coachingArea);
            setFeedbackResponse(draft.feedbackResponse as (typeof FEEDBACK_RESPONSE_OPTIONS)[number] | "");
            setHonestyConcerns(draft.honestyConcerns as (typeof HONESTY_OPTIONS)[number] | "");
            setComplianceIncidents(draft.complianceIncidents as (typeof COMPLIANCE_OPTIONS)[number] | "");
            setLicenseStanding(draft.licenseStanding as (typeof LICENSE_OPTIONS)[number] | "");
            setPreferPhoneNumber(draft.preferPhoneNumber);
            setRecommendHire(draft.recommendHire as (typeof RECOMMEND_HIRE_OPTIONS)[number]["value"] | "");
            setNotes(draft.notes);
            setConsentToContact(draft.consentToContact);
            setScreen(draft.screen);
            setDraftRestored(true);
          } else {
            setScreen(2);
          }
        }
      })
      .catch((err) => setLoadError(err.message));
  }, [token]);

  // Debounced autosave — fires while the referee is actively working through
  // screens 2-4, so a closed tab or dropped connection loses at most a
  // fraction of a second of typing, not the whole reference. Screens 0/1
  // have nothing worth restoring (no answer data yet, and re-verifying is
  // required again anyway); a successful submit clears the draft itself.
  React.useEffect(() => {
    if (!token) return;
    if (screen !== 2 && screen !== 3 && screen !== 4) return;
    const handle = setTimeout(() => {
      saveDraft(token, {
        screen,
        relationship,
        reportingRelationship,
        refereeOrganization,
        phone,
        durationKnown,
        interactionFrequency,
        jobTitleRecalled,
        employmentFrom,
        employmentTo,
        stillEmployed,
        mainResponsibilities,
        reportedTo,
        leavingReason,
        wouldRehire,
        wouldRehireExplanation,
        executionScore,
        executionExample,
        teamworkScore,
        teamworkExample,
        communicationScore,
        communicationExample,
        topStrengths,
        coachingArea,
        feedbackResponse,
        honestyConcerns,
        complianceIncidents,
        licenseStanding,
        preferPhoneNumber,
        recommendHire,
        notes,
        consentToContact,
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [
    token,
    screen,
    relationship,
    reportingRelationship,
    refereeOrganization,
    phone,
    durationKnown,
    interactionFrequency,
    jobTitleRecalled,
    employmentFrom,
    employmentTo,
    stillEmployed,
    mainResponsibilities,
    reportedTo,
    leavingReason,
    wouldRehire,
    wouldRehireExplanation,
    executionScore,
    executionExample,
    teamworkScore,
    teamworkExample,
    communicationScore,
    communicationExample,
    topStrengths,
    coachingArea,
    feedbackResponse,
    honestyConcerns,
    complianceIncidents,
    licenseStanding,
    preferPhoneNumber,
    recommendHire,
    notes,
    consentToContact,
  ]);

  function discardDraftAndRestart() {
    if (token) clearDraft(token);
    setDraftRestored(false);
    setRelationship("");
    setReportingRelationship("");
    setRefereeOrganization("");
    setDurationKnown("");
    setInteractionFrequency("");
    setJobTitleRecalled("");
    setEmploymentFrom("");
    setEmploymentTo("");
    setStillEmployed(false);
    setMainResponsibilities("");
    setReportedTo("");
    setLeavingReason("");
    setWouldRehire("");
    setWouldRehireExplanation("");
    setExecutionScore(0);
    setExecutionExample("");
    setTeamworkScore(0);
    setTeamworkExample("");
    setCommunicationScore(0);
    setCommunicationExample("");
    setTopStrengths("");
    setCoachingArea("");
    setFeedbackResponse("");
    setHonestyConcerns("");
    setComplianceIncidents("");
    setLicenseStanding("");
    setPreferPhoneNumber("");
    setRecommendHire("");
    setNotes("");
    setConsentToContact(true);
    setScreen(2);
  }

  if (loadError === "missing_token" || loadError === "expired") {
    return (
      <StatusScreen icon={<AlertTriangle className="h-6 w-6" />} iconTone="bg-amber-50 text-amber-600" title="Link expired">
        <p className="text-[15px] leading-relaxed text-[#475467]">
          This reference check link is no longer valid. Please contact{" "}
          <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
            careers@pendahealth.com
          </a>{" "}
          for a new one.
        </p>
      </StatusScreen>
    );
  }

  if (loadError) {
    return (
      <StatusScreen icon={<AlertTriangle className="h-6 w-6" />} iconTone="bg-red-50 text-red-500" title="Something went wrong">
        <p className="text-[15px] leading-relaxed text-[#475467]">
          Please try again later, or contact{" "}
          <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
            careers@pendahealth.com
          </a>
          .
        </p>
      </StatusScreen>
    );
  }

  if (!data) {
    return <StatusScreen icon={<Loader2 className="h-6 w-6 animate-spin" />} title="Loading…" />;
  }

  if (submitted) {
    return (
      <StatusScreen icon={<Check className="h-[26px] w-[26px]" strokeWidth={2.4} />} title="Reference submitted">
        <p className="mb-1.5 text-[15px] leading-[1.65] text-[#475467]">
          Thank you for your honesty — your perspective genuinely helps us get this hire right. We&apos;ve let Penda
          Health&apos;s hiring team know, and if they need anything else, they&apos;ll reach out to you directly.
        </p>
        <p className="mt-5 text-[13.5px] text-[#98a2b3]">You can close this window now.</p>
      </StatusScreen>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <StatusScreen icon={<Info className="h-6 w-6" />} title="Already submitted">
        <p className="text-[15px] leading-relaxed text-[#475467]">
          You&apos;ve already submitted a reference for {data.candidateName}. Contact{" "}
          <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
            careers@pendahealth.com
          </a>{" "}
          if you need to make a correction.
        </p>
      </StatusScreen>
    );
  }

  const isClinical = data.segment === "IPS";
  const needsPhone = honestyConcerns === PREFERS_PHONE || complianceIncidents === PREFERS_PHONE;

  const canContinueStep2 =
    !!relationship &&
    !!reportingRelationship &&
    refereeOrganization.trim().length > 0 &&
    !!durationKnown &&
    !!interactionFrequency &&
    jobTitleRecalled.trim().length > 0 &&
    mainResponsibilities.trim().length >= MIN_RESPONSIBILITIES_LENGTH &&
    !!leavingReason &&
    !!wouldRehire &&
    (wouldRehire === "Yes" || wouldRehireExplanation.trim().length > 0);

  const canContinueStep3 =
    executionScore > 0 &&
    executionExample.trim().length >= MIN_EXAMPLE_LENGTH &&
    teamworkScore > 0 &&
    teamworkExample.trim().length >= MIN_EXAMPLE_LENGTH &&
    communicationScore > 0 &&
    communicationExample.trim().length >= MIN_EXAMPLE_LENGTH;

  const canSubmit =
    topStrengths.trim().length >= MIN_TEXT_LENGTH &&
    coachingArea.trim().length >= MIN_COACHING_LENGTH &&
    !!feedbackResponse &&
    !!honestyConcerns &&
    (!isClinical || (!!complianceIncidents && !!licenseStanding)) &&
    (!needsPhone || preferPhoneNumber.trim().length > 0) &&
    !!recommendHire;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/referee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          relationship,
          reportingRelationship,
          refereeOrganization,
          phone: phone || undefined,
          durationKnown,
          interactionFrequency,
          jobTitleRecalled,
          employmentFrom: employmentFrom ? monthToIsoDate(employmentFrom) : undefined,
          employmentTo: stillEmployed ? undefined : employmentTo ? monthToIsoDate(employmentTo) : undefined,
          stillEmployed,
          mainResponsibilities,
          reportedTo: reportedTo || undefined,
          leavingReason,
          executionScore,
          executionExample,
          teamworkScore,
          teamworkExample,
          communicationScore,
          communicationExample,
          wouldRehire,
          wouldRehireExplanation: wouldRehire === "Yes" ? wouldRehireExplanation || undefined : wouldRehireExplanation,
          topStrengths,
          coachingArea,
          feedbackResponse,
          honestyConcerns,
          complianceIncidents: isClinical ? complianceIncidents : undefined,
          licenseStanding: isClinical ? licenseStanding : undefined,
          preferPhoneNumber: needsPhone ? preferPhoneNumber : undefined,
          recommendHire,
          consentToContact,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === "already_submitted"
            ? "This reference has already been submitted."
            : body.error === "google_verification_required"
              ? "Please verify with Google before submitting."
              : "Something went wrong. Please try again."
        );
      }
      if (token) clearDraft(token);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Screen 0 — intro. Two-panel layout per Main.dc.html: a dark gradient
  // hero on the left carrying the brand + headline, candidate context + CTA
  // on the right. Candidate/role details are shown here (read-only) rather
  // than re-asked anywhere in the wizard.
  // -------------------------------------------------------------------------
  if (screen === 0) {
    return (
      <div className="light flex min-h-screen flex-col bg-white lg:flex-row">
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-penda-blue via-[#1442D6] to-penda-blue-dark px-8 py-10 sm:px-12 sm:py-14 lg:w-[560px] lg:shrink-0">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "radial-gradient(circle, #FFFFFF 1px, transparent 1px)", backgroundSize: "18px 18px" }}
          />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-penda-pink/30 blur-3xl" />
          <div className="pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
          <div className="relative z-10 flex items-center">
            <span className="inline-flex items-center rounded-lg bg-white px-2.5 py-[7px] shadow-sm">
              <Image src="/assets/logo.webp" alt="Penda Health" width={200} height={80} className="h-8 w-auto object-contain" />
            </span>
          </div>

          <div className="relative z-10 my-10 lg:my-0">
            <p className="mb-[18px] text-xs font-bold uppercase tracking-[1.2px] text-white/65">Penda Health · Reference Check</p>
            <h1 className="mb-[18px] max-w-[440px] text-[32px] font-extrabold leading-[1.16] text-white sm:text-[40px]">
              A few honest minutes from you helps us get this hire right.
            </h1>
            <p className="max-w-[420px] text-base leading-relaxed text-white/75">
              You were listed as a reference — your perspective on their work is one of the most valuable inputs we get.
            </p>
          </div>

          <div className="relative z-10 text-[13px] text-white/55">
            Questions?{" "}
            <a href="mailto:careers@pendahealth.com" className="text-white">
              careers@pendahealth.com
            </a>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12 lg:px-[88px]">
          <div className="w-full max-w-[520px]">
            <p className="mb-3.5 text-[13px] font-semibold uppercase tracking-[0.3px] text-[#98a2b3]">Reference request</p>
            <h1 className="mb-7 text-[26px] font-extrabold leading-[1.3] text-[#101828] sm:text-[30px]">
              Hi {data.refereeName}, {data.candidateName} listed you as a reference for the {data.roleTitle} role at Penda
              Health.
            </h1>

            <div className="mb-6 rounded-[14px] border border-[#e4e7ec] bg-[#f9fafb] p-5">
              <div className="flex flex-wrap gap-7 text-sm text-[#475467]">
                <div>
                  <span className="text-[#98a2b3]">Candidate</span>
                  <br />
                  <span className="font-semibold text-[#101828]">{data.candidateName}</span>
                </div>
                <div>
                  <span className="text-[#98a2b3]">Role</span>
                  <br />
                  <span className="font-semibold text-[#101828]">{data.roleTitle}</span>
                </div>
                {data.recruiterName && (
                  <div>
                    <span className="text-[#98a2b3]">Requested by</span>
                    <br />
                    <span className="font-semibold text-[#101828]">{data.recruiterName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-penda-blue-light px-[13px] py-[7px] text-[13px] font-bold text-penda-blue">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E55FF" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.5 2" strokeLinecap="round" />
                </svg>
                About 4 minutes
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-penda-blue-light px-[13px] py-[7px] text-[13px] font-bold text-penda-blue">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E55FF" strokeWidth="2">
                  <rect x="4" y="4" width="6" height="6" rx="1" />
                  <rect x="14" y="4" width="6" height="6" rx="1" />
                  <rect x="4" y="14" width="6" height="6" rx="1" />
                  <rect x="14" y="14" width="6" height="6" rx="1" />
                </svg>
                4 quick steps
              </span>
            </div>

            <p className="mb-8 text-sm leading-[1.7] text-[#475467]">
              Your answers stay confidential and are only shared with Penda Health&apos;s hiring team. You can pause
              anytime and return using the link in your email — nothing here is one long page to scroll through.
            </p>

            <ContinueButton onClick={() => setScreen(1)}>Start reference check</ContinueButton>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Screen 1 — verify. Per Verify.dc.html.
  // -------------------------------------------------------------------------
  if (screen === 1) {
    return (
      <div className="light flex min-h-screen flex-col bg-white">
        <RefereeTopBar candidateName={data.candidateName} step={1} totalSteps={4} />
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-16">
          <div className="w-full max-w-[480px]">
            <p className="mb-3.5 text-xs font-bold uppercase tracking-[0.6px] text-penda-blue">Step 1 of 4 · Verify it&apos;s you</p>
            <h1 className="mb-3 text-2xl font-extrabold leading-[1.3] text-[#101828] sm:text-[28px]">Let&apos;s confirm it&apos;s really you</h1>
            <p className="mb-8 text-[15px] leading-relaxed text-[#475467]">
              To keep reference checks trustworthy, sign in with the Google account matching{" "}
              <strong className="text-[#101828]">{data.refereeEmail}</strong> before continuing.
            </p>

            {token && <GoogleVerificationStep token={token} data={data} onVerified={() => setScreen(2)} />}

            <div className="mt-6">
              <BackLink onClick={() => setScreen(0)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const verifiedNote = (
    <p className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Identity verified with Google.
    </p>
  );

  const draftBanner = draftRestored ? (
    <div className="mb-6">
      <DraftRestoredBanner onDiscard={discardDraftAndRestart} />
    </div>
  ) : null;

  // -------------------------------------------------------------------------
  // Screen 2 — referee & employment details. Per RelationshipRatings.dc.html.
  // -------------------------------------------------------------------------
  if (screen === 2) {
    return (
      <div className="light flex min-h-screen flex-col bg-white">
        <RefereeTopBar candidateName={data.candidateName} step={2} totalSteps={4} />
        <div className="flex-1 px-5 py-8 sm:px-16">
          <div className="mx-auto max-w-[1180px]">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.6px] text-penda-blue">Step 2 of 4 · Referee &amp; employment details</p>
            <h1 className="mb-2 text-2xl font-extrabold leading-[1.3] text-[#101828] sm:text-[26px]">Tell us about your role, and theirs</h1>
            {verifiedNote}
            {draftBanner}

            <div className="grid grid-cols-1 gap-x-14 gap-y-8 lg:grid-cols-2">
              <div className="space-y-3.5">
                <p className="text-[15px] font-bold text-[#101828]">Your details as referee</p>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Field label="Relationship to candidate">
                    <BasicSelect value={relationship} onChange={setRelationship} placeholder="Select" options={RELATIONSHIPS} />
                  </Field>
                  <Field label="Their reporting relationship to you">
                    <BasicSelect
                      value={reportingRelationship}
                      onChange={(v) => setReportingRelationship(v as (typeof REPORTING_RELATIONSHIPS)[number])}
                      placeholder="Select"
                      options={REPORTING_RELATIONSHIPS}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Field label="Your organization">
                    <Input
                      className={fieldClass}
                      value={refereeOrganization}
                      onChange={(e) => setRefereeOrganization(e.target.value)}
                      placeholder="e.g. Nairobi Women's Hospital"
                    />
                  </Field>
                  <Field label="Your phone number">
                    <Input className={fieldClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 07XX XXX XXX" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Field label="How long did you work together?">
                    <BasicSelect value={durationKnown} onChange={setDurationKnown} placeholder="Select" options={DURATIONS} />
                  </Field>
                  <Field label="How often did you interact?">
                    <BasicSelect
                      value={interactionFrequency}
                      onChange={(v) => setInteractionFrequency(v as (typeof INTERACTION_FREQUENCIES)[number])}
                      placeholder="Select"
                      options={INTERACTION_FREQUENCIES}
                    />
                  </Field>
                </div>
              </div>

              <div className="space-y-3.5">
                <p className="text-[15px] font-bold text-[#101828]">Employment verification</p>

                <Field label="Their job title, as you recall it">
                  <Input className={fieldClass} value={jobTitleRecalled} onChange={(e) => setJobTitleRecalled(e.target.value)} placeholder="e.g. Clinical Officer" />
                </Field>

                <div>
                  <FieldLabel>Employment dates you recall</FieldLabel>
                  <div className="mb-2 grid grid-cols-2 gap-3">
                    <input
                      type="month"
                      aria-label="Employment start month"
                      className={fieldClass}
                      value={employmentFrom}
                      max={todayMonth}
                      onChange={(e) => setEmploymentFrom(e.target.value)}
                    />
                    <input
                      type="month"
                      aria-label="Employment end month"
                      className={fieldClass}
                      value={employmentTo}
                      max={todayMonth}
                      onChange={(e) => setEmploymentTo(e.target.value)}
                      disabled={stillEmployed}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-[12.5px] text-[#475467]">
                    <input
                      type="checkbox"
                      checked={stillEmployed}
                      onChange={(e) => setStillEmployed(e.target.checked)}
                      className="h-[15px] w-[15px] accent-penda-blue"
                    />
                    Still employed there, as far as I know
                  </label>
                </div>

                <Field label="Their main responsibilities">
                  <TextArea value={mainResponsibilities} onChange={setMainResponsibilities} rows={2} minLength={MIN_RESPONSIBILITIES_LENGTH} placeholder="e.g. Outpatient consults, minor procedures, supervising 2 nurses" />
                </Field>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Field label="Who did they report to?">
                    <Input className={fieldClass} value={reportedTo} onChange={(e) => setReportedTo(e.target.value)} placeholder="Name / title" />
                  </Field>
                  <Field label="Why did they leave (or are they still there)?">
                    <BasicSelect
                      value={leavingReason}
                      onChange={(v) => setLeavingReason(v as (typeof LEAVING_REASONS)[number])}
                      placeholder="Select"
                      options={LEAVING_REASONS}
                    />
                  </Field>
                </div>

                <div className="border-t border-[#e4e7ec] pt-3.5">
                  <p className="mb-2 text-[12.5px] font-semibold text-[#344054]">Would you rehire them, given the opportunity?</p>
                  <div className="mb-2.5">
                    <ChoiceGroup options={WOULD_REHIRE_OPTIONS} value={wouldRehire} onChange={setWouldRehire} size="sm" />
                  </div>
                  <TextArea value={wouldRehireExplanation} onChange={setWouldRehireExplanation} rows={2} placeholder="Please explain your answer…" />
                </div>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between pb-2">
              <BackLink onClick={() => setScreen(1)} />
              <ContinueButton onClick={() => setScreen(3)} disabled={!canContinueStep2} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Screen 3 — performance feedback (Execution / Teamwork / Communication).
  // Per FeedbackCharacter.dc.html.
  // -------------------------------------------------------------------------
  if (screen === 3) {
    const cards: {
      key: string;
      badge: string;
      title: string;
      score: number;
      setScore: (n: number) => void;
      prompt: string;
      example: string;
      setExample: (v: string) => void;
      placeholder: string;
    }[] = [
      {
        key: "execution",
        badge: "E",
        title: "Execution & performance",
        score: executionScore,
        setScore: setExecutionScore,
        prompt:
          "Describe how reliably they carried out their regular duties — and how they performed when things got difficult (an emergency, a rush, being short-staffed)",
        example: executionExample,
        setExample: setExecutionExample,
        placeholder: "e.g. During a short-staffed night shift with the ER full…",
      },
      {
        key: "teamwork",
        badge: "T",
        title: "Teamwork & collaboration",
        score: teamworkScore,
        setScore: setTeamworkScore,
        prompt: "Describe a time they collaborated well with others, or handled a disagreement.",
        example: teamworkExample,
        setExample: setTeamworkExample,
        placeholder: "An example makes this rating meaningful…",
      },
      {
        key: "communication",
        badge: "C",
        title: "Communication",
        score: communicationScore,
        setScore: setCommunicationScore,
        prompt: "Give an example of them communicating something complex or difficult, clearly.",
        example: communicationExample,
        setExample: setCommunicationExample,
        placeholder: "An example makes this rating meaningful…",
      },
    ];

    return (
      <div className="light flex min-h-screen flex-col bg-white">
        <RefereeTopBar candidateName={data.candidateName} step={3} totalSteps={4} />
        <div className="flex-1 px-5 py-8 sm:px-16">
          <div className="mx-auto max-w-[1260px]">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.6px] text-penda-blue">Step 3 of 4 · Performance feedback</p>
            <h1 className="mb-1.5 text-2xl font-extrabold leading-[1.3] text-[#101828] sm:text-[26px]">Rate their work — with an example for each</h1>
            <p className="mb-6 text-sm text-[#475467]">A specific example is more useful to us than the rating alone.</p>
            {verifiedNote}
            {draftBanner}

            <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
              {cards.map((c) => (
                <div key={c.key} className="rounded-[14px] border border-[#e4e7ec] p-[22px]">
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-penda-blue text-[13px] font-extrabold text-white">
                      {c.badge}
                    </div>
                    <div className="text-[14.5px] font-bold text-[#101828]">{c.title}</div>
                  </div>
                  <RatingScale value={c.score} onChange={c.setScore} />
                  <p className="mb-2 text-[13px] font-semibold text-[#344054]">{c.prompt}</p>
                  <TextArea value={c.example} onChange={c.setExample} rows={6} minLength={MIN_EXAMPLE_LENGTH} placeholder={c.placeholder} />
                </div>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-between pb-2">
              <BackLink onClick={() => setScreen(2)} />
              <ContinueButton onClick={() => setScreen(4)} disabled={!canContinueStep3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Screen 4 — strengths & recommendation. Per Recommendation.dc.html.
  // -------------------------------------------------------------------------
  return (
    <div className="light flex min-h-screen flex-col bg-white">
      <RefereeTopBar candidateName={data.candidateName} step={4} totalSteps={4} />
      <form onSubmit={handleSubmit} className="flex-1 px-5 py-8 sm:px-16">
        <div className="mx-auto max-w-[1180px]">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.6px] text-penda-blue">Step 4 of 4 · Strengths &amp; recommendation</p>
          <h1 className="mb-2 text-2xl font-extrabold leading-[1.3] text-[#101828] sm:text-[26px]">Last few things</h1>
          {verifiedNote}
          {draftBanner}

          <div className="mb-7 grid grid-cols-1 gap-x-14 gap-y-8 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-[15px] font-bold text-[#101828]">Strengths &amp; development</p>

              <Field label="Their three greatest strengths">
                <TextArea value={topStrengths} onChange={setTopStrengths} rows={2} minLength={MIN_TEXT_LENGTH} placeholder="e.g. Calm under pressure, meticulous documentation, mentors juniors" />
              </Field>

              <Field label="One area where they needed coaching or support">
                <TextArea value={coachingArea} onChange={setCoachingArea} rows={2} minLength={MIN_COACHING_LENGTH} placeholder="Be specific — this helps their next manager, not just us" />
              </Field>

              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-[#344054]">How did they respond to feedback or criticism?</p>
                <ChoiceGroup options={FEEDBACK_RESPONSE_OPTIONS} value={feedbackResponse} onChange={setFeedbackResponse} size="sm" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[15px] font-bold text-[#101828]">Character &amp; compliance</p>

              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-[#344054]">Any concerns about their honesty, trustworthiness, or professional conduct?</p>
                <ChoiceGroup options={HONESTY_OPTIONS} value={honestyConcerns} onChange={setHonestyConcerns} size="sm" />
              </div>

              {isClinical && (
                <>
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <p className="text-[12.5px] font-semibold text-[#344054]">Any compliance, safety, or patient-care incidents you&apos;re aware of?</p>
                      <span className="rounded-full bg-ips-bg px-[7px] py-[2px] text-[10px] font-bold uppercase tracking-[0.3px] text-ips-fg">
                        Clinical roles
                      </span>
                    </div>
                    <ChoiceGroup options={COMPLIANCE_OPTIONS} value={complianceIncidents} onChange={setComplianceIncidents} size="sm" />
                  </div>
                  <div>
                    <p className="mb-2 text-[12.5px] font-semibold text-[#344054]">Is their professional license / certification in good standing?</p>
                    <ChoiceGroup options={LICENSE_OPTIONS} value={licenseStanding} onChange={setLicenseStanding} size="sm" />
                  </div>
                </>
              )}

              {needsPhone && (
                <Field label="Best number to reach you on">
                  <Input className={fieldClass} value={preferPhoneNumber} onChange={(e) => setPreferPhoneNumber(e.target.value)} placeholder="+254…" />
                </Field>
              )}

              <p className="text-xs leading-relaxed text-[#98a2b3]">
                Picking &quot;prefer to discuss by phone&quot; on either question above is enough — we&apos;ll call the number you gave us in Step 2.
              </p>
            </div>
          </div>

          <div className="border-t border-[#e4e7ec] pt-6">
            <p className="mb-2.5 text-[14.5px] font-semibold text-[#101828]">Overall, would you recommend hiring this candidate?</p>
            <div className="mb-5">
              <ChoiceGroup options={RECOMMEND_HIRE_OPTIONS} value={recommendHire} onChange={setRecommendHire} />
            </div>

            <div className="mb-5 max-w-[640px]">
              <p className="mb-2 text-[13.5px] font-semibold text-[#101828]">
                Anything else you&apos;d like to add? <span className="font-medium text-[#98a2b3]">(optional)</span>
              </p>
              <TextArea value={notes} onChange={setNotes} rows={2} placeholder="Anything not covered above…" />
            </div>

            <label className="mb-5 flex max-w-[640px] items-start gap-2.5 text-[13px] leading-relaxed text-[#475467]">
              <input
                type="checkbox"
                checked={consentToContact}
                onChange={(e) => setConsentToContact(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-penda-blue"
              />
              I&apos;m comfortable being contacted if Penda Health needs to follow up on my answers.
            </label>

            {submitError && <p className="mb-4 text-sm text-red-500">{submitError}</p>}

            <div className="flex items-center justify-between pb-2">
              <BackLink onClick={() => setScreen(3)} />
              <ContinueButton type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Submitting…" : "Submit reference check"}
              </ContinueButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function RefereePage() {
  return (
    <React.Suspense fallback={null}>
      <RefereeForm />
    </React.Suspense>
  );
}
