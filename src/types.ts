// Core enums

export type Segment = "IPS" | "SO";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export type RoleStatus = "Open" | "Allocated" | "Filled" | "On Hold" | "Cancelled";

export type CandidateStage =
  | "First Interview"
  | "Second Interview"
  | "Panel Interview"
  | "Work Trial"
  | "Reference Check"
  | "Offer"
  | "Hired"
  | "Backup Pool"
  | "Rejected"
  | "Withdrawn";

export type InterviewStage = "First Interview" | "Second Interview" | "Panel Interview";

export type InterviewType = "In-person" | "Google Meet" | "Phone" | "WhatsApp";

export type InterviewOutcome = "Pass" | "Fail" | "Pending";

export type AttendanceStatus = "Attended" | "No-show" | "Pending";

export type WorkTrialStatus = "Scheduled" | "Awaiting Arrival" | "Awaiting Score" | "Complete";

export type GapReason =
  | "Transfer"
  | "Promotion"
  | "Voluntary Resignation"
  | "Termination"
  | "New Addition";

export type RequisitionType = "SO New Role" | "SO Replacement" | "IPS Gap";

export type RequisitionStatus =
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Converted to Open Role";

export type OfferOutcome = "Pending" | "Accepted" | "Declined" | "Negotiating" | "Withdrawn";

export type JoinStatus = "Pending" | "Joined" | "Did Not Join";

export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Reliever" | "Locum";

/** The 5 clinical cadres tracked by the Staffing Projections feature — see StaffingProjection. */
export type Cadre = "CC" | "Labtech" | "Nurse" | "Pharmtech" | "Clinical Officer";

// Permission tier — distinct from `jobTitle`, which is free text describing
// what the person actually does at Penda. This enum is what gates access.
export type UserRoleName = "recruitment_manager" | "recruitment_user" | "contributor" | "branch_manager";

export const USER_ROLE_LABELS: Record<UserRoleName, string> = {
  recruitment_manager: "Recruitment Manager",
  recruitment_user: "Recruitment User",
  contributor: "Contributor",
  branch_manager: "Branch Manager",
};

export type DashboardDefaultView = "dashboard" | "pipeline" | "requisitions" | "work-trials" | "offers";

export type EmailNotificationPreference = "all" | "urgent" | "none";

// Entities — mirror the 11 linked Airtable tables

export interface Branch {
  id: string;
  branchId: string;
  name: string;
  city: string;
  region: string;
  branchManager: string;
  bmEmail: string;
  bmPhone: string;
  regionalManager: string;
  capacity: number;
  active: boolean;
  workTrialActive: boolean;
  address: string;
  mapPinUrl: string;
  /** True while this branch is in the expansion phase (e.g. Kinoo, G44) — drives the Expansion Tracker's branch scoping. */
  expansionBranch?: boolean;
  /** IPS clinic vs. SO (Support Office / Telemedicine) — scopes which branches show up for a given requisition/role segment. */
  segment: Segment;
}

/** Day-of-week names matching the Airtable multipleSelects choices. */
export type WorkTrialDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

/** One row in the Work Trial Specialty Config table. */
export interface SpecialtyConfig {
  id: string;
  /** Internal key, e.g. "Dental" */
  specialty: string;
  /** Label shown to candidates, e.g. "Dental" */
  displayName: string;
  /** Airtable record IDs of allowed branches */
  branchIds: string[];
  /** Which days of the week are available */
  availableDays: WorkTrialDay[];
  active: boolean;
  notes: string;
}

/**
 * The one-row App Settings table (src/app/api/settings/route.ts). More
 * app-wide config can land as additional fields here later.
 */
export interface AppSettings {
  id: string | null;
  /**
   * Exclusive cutoff (YYYY-MM-DD) — no new work-trial date on or after this
   * may be booked via /work-trial-request. `null` = no cutoff, falls back to
   * the default rolling window (see src/lib/work-trial-timing.ts).
   */
  workTrialBookingCutoffDate: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export type WorkTrialRoleCategory = "General" | "Specialist";

export type RequisitionLevel =
  | "Entry"
  | "Junior"
  | "Mid"
  | "Senior"
  | "Lead"
  | "Manager"
  | "Senior Manager"
  | "Head/Director";

export type VacancyReasonType =
  | "Resignation"
  | "Termination"
  | "Internal Promotion"
  | "Retirement"
  | "Contract End"
  | "Other";

export interface Requisition {
  id: string;
  reqId: string;
  type: RequisitionType;
  roleTitle: string;
  department: string;
  segment: Segment;
  gapReason?: GapReason;
  reasonType?: VacancyReasonType;
  branchId?: string;
  employmentType?: EmploymentType;
  level?: RequisitionLevel;
  headcount: number;
  justification: string;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  urgency: Priority;
  jdAttached: boolean;
  jdUrl?: string;
  status: RequisitionStatus;
  approverChain: string[];
  currentApproverIndex: number;
  submittedBy: string;
  submittedAt: string;
  expectedStartDate?: string;
  context?: string;
  submitterName?: string;
  submitterEmail?: string;
  submitterRole?: string;
  source?: "internal" | "public-link";
  budgetEvaluationConfirmed?: boolean;
}

export interface OpenRole {
  id: string;
  roleId: string;
  title: string;
  segment: Segment;
  department: string;
  location: string;
  branchId?: string;
  /**
   * Every branch this role's headcount is linked to in Airtable — usually
   * just [branchId], but some roles are deliberately shared/split across
   * several geographically clustered branches (location reads "Multiple
   * Locations" for these; see the HC 0.5-increment feature). branchId is
   * only the *first* of these — anything scoping by branch membership
   * (e.g. the Expansion Tracker) must check branchIds, not branchId, or it
   * will miss a role whenever the branch it cares about isn't first in the
   * Airtable link order. Writable via NewOpenRoleDialog's "group role"
   * mode and via closing a group role's gap (see useRoleEditState's
   * closeGroupGap, which shrinks this list as each branch's seat is
   * carved out into its own single-branch role).
   */
  branchIds?: string[];
  priority: Priority;
  status: RoleStatus;
  hcApproved: number;
  hcFilled: number;
  recruiter: string;
  hiringManager: string;
  hiringManagerEmail?: string;
  datePosted: string;
  dateClosed?: string | null;
  employmentType?: EmploymentType;
  notes?: string;
  internalFill?: boolean;
  internalFillName?: string;
  /**
   * Set when this role was filled internally: points at the Requisition
   * raised to backfill the vacancy that internal move created elsewhere.
   * Its status (and, once converted, the resulting OpenRole's headcount)
   * is what the Expansion Tracker's "pending replacement" badge derives
   * from — see resolveReplacementStatus() in expansion-helpers.ts.
   */
  replacementRequisitionId?: string;
  requisitionId?: string;
  requisitionSubmitterName?: string;
  requisitionSubmitterEmail?: string;
  /** Which of the 5 tracked cadres this role is, for the Staffing Projections page — blank for roles outside those 5. */
  cadre?: Cadre;
}

export interface Candidate {
  id: string;
  candId: string;
  name: string;
  phone: string;
  email: string;
  roleId?: string;
  segment?: Segment;
  department?: string;
  stage: CandidateStage;
  source: string;
  gender: "Male" | "Female" | undefined;
  employmentType: EmploymentType;
  referee1?: { name: string; email: string; phone: string };
  referee2?: { name: string; email: string; phone: string };
  workTrialStatus?: WorkTrialStatus;
  refCheckStatus?: string;
  offerStatus?: OfferOutcome;
  joined?: JoinStatus;
  stageEnteredAt: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  schedId: string;
  candidateId: string;
  roleId: string;
  date: string;
  time: string;
  weekLabel: string;
  month: string;
  stage: InterviewStage;
  type: InterviewType;
  location: string;
  interviewers: string[];
  confirmed: boolean;
  reminderSent: boolean;
  attendance: AttendanceStatus;
  outcome: InterviewOutcome;
  notes?: string;
}

export interface WorkTrial {
  id: string;
  wtId: string;
  candidateId: string;
  roleId?: string;        // linked role — enables filtering by dept/function over time
  branchId: string;
  date: string;
  supervisor: string;
  createdAt?: string;     // when the trial was scheduled
  arrivalMarked: boolean | null;
  scoreTechnical: number | null;
  scorePatient: number | null;
  scoreSafety: number | null;
  scoreCulture: number | null;
  total: number | null;
  passFail: "Pass" | "Fail" | "Pending";
  formSubmittedAt: string | null;
  submittedByRole: "BM" | "Incharge" | null;
  bmApprovedAt: string | null;
  reminder12hSent: boolean;
  escalation24hSent: boolean;
  commentCulture?: string;
  commentPatient?: string;
  commentTechnical?: string;
  strengths?: string;
  areasOfDevelopment?: string;
  overallRecommendation?: string;
  // "Online" = the six detailed 250-char fields above were filled in through
  // the digital scoring flow. "Uploaded" = a paper/PDF form was uploaded
  // instead — scores are still real, but commentCulture/commentPatient/
  // commentTechnical/strengths/areasOfDevelopment are skipped in favor of a
  // single (shorter) overallRecommendation. null = not yet submitted either way.
  submissionMethod: "Online" | "Uploaded" | null;
  uploadedFormFiles?: { url: string; filename: string }[];
  roleCategory?: WorkTrialRoleCategory;
  specialty?: string;
}

// The 4-option set is what the redesigned /referee form writes going
// forward. The last two are legacy values from before the redesign — still
// valid on old records (never removed from the live Airtable single-select
// to avoid orphaning historical data), but no longer offered or accepted on
// new submissions.
export type RehireAnswer =
  | "Yes, without hesitation"
  | "Yes, with reservations"
  | "No"
  | "Unsure"
  | "Yes, with some reservations"
  | "No, I would not recommend them";

export interface RefereeStatus {
  name: string;
  email: string;
  phone: string;
  emailSent: boolean;
  smsSent: boolean;
  responded: boolean;
  respondedAt?: string;
  relationship?: string;
  /** Whether the referee directly supervised the candidate (redesigned form, step 2). */
  directlySupervised?: boolean;
  durationKnown?: string;
  /** Employment period the referee is speaking to, "YYYY-MM". */
  employmentFrom?: string;
  /** Absent + stillEmployed=true reads as "present". */
  employmentTo?: string;
  stillEmployed?: boolean;
  techScore?: number;
  reliabilityScore?: number;
  teamworkScore?: number;
  /** Added in the redesign, alongside tech/reliability/teamwork. */
  problemSolvingScore?: number;
  adaptabilityScore?: number;
  wouldRehire?: RehireAnswer;
  /** @deprecated Pre-redesign field. Kept for historical records; new submissions write `strengthsAndDevelopment` instead. */
  strengthExample?: string;
  /** @deprecated Pre-redesign field. Kept for historical records; new submissions write `strengthsAndDevelopment` instead. */
  developmentAreas?: string;
  /** Merged replacement for strengthExample + developmentAreas, introduced in the redesign. */
  strengthsAndDevelopment?: string;
  /** "How did they handle pressure, conflict, or a tough decision?" — redesigned form, step 3. */
  conflictExample?: string;
  honestyConcerns?: "No concerns" | "Some concerns" | "Prefer to discuss by phone";
  /** Clinical (IPS) roles only — not asked of Support Office referees. */
  complianceIncidents?: "None that I know of" | "Yes" | "Prefer to discuss by phone";
  /** Clinical (IPS) roles only — not asked of Support Office referees. */
  licenseStanding?: "Yes" | "No" | "N/A" | "Not sure";
  /** Shown/collected only when honestyConcerns or complianceIncidents is "Prefer to discuss by phone". */
  preferPhoneNumber?: string;
  /** The referee's own overall 1-5 recommendation — distinct from the AI's recommendationScore. */
  overallRecommendScore?: number;
  /** "OK to contact you again if we have follow-up questions?" */
  consentToContact?: boolean;
  notes?: string;
  /** True once this referee signed in with Google on /referee and it matched the email on file. */
  googleVerified?: boolean;
  /** The actual Google account email used to sign in — may differ from `email` on a TA override. */
  googleVerifiedEmail?: string;
  /** Set (to a staff name/email) when a TA manually overrides a Google-verification mismatch. */
  googleVerifiedOverrideBy?: string;
  /** True once a reminder email has gone out for this referee's 24h-no-response nudge. */
  reminder24hSent?: boolean;
}

/** How a reference check got started — see the two-initiation-path design in SETUP.md. */
export type ReferenceCheckSource = "TA Added" | "Candidate Submitted";

/**
 * Derived, server-written status — never edited directly by a user. Drives
 * the TA verification queue, the "ready for offer" badge/auto-advance, and
 * every Airtable automation's trigger condition for this table.
 */
export type ReferenceCheckStatus =
  | "Awaiting Verification"
  | "Awaiting Responses"
  | "1 Referee In"
  | "Ready for Offer";

/**
 * The AI "intelligence and insights layer" for a reference check — richer
 * than a single summary paragraph: a status/score triad plus structured
 * takeaways a hiring manager can scan without reading every free-text answer.
 * Generated by src/lib/ai/reference-check-summary.ts, persisted on the
 * ReferenceChecks record (not just embedded in the PDF) so it shows on the
 * dashboard card and flows into Penny's chat context.
 */
export interface ReferenceCheckAiInsights {
  overallStatus:
    | "Strong Recommend"
    | "Recommend"
    | "Recommend with Reservations"
    | "Do Not Recommend"
    | "Insufficient Data";
  summary: string;
  recommendationScore: number;
  overallScore: number;
  confidenceScore: number;
  /** Concrete positives worth calling out to a hiring manager, one per entry. */
  keyStrengths: string[];
  /** Concrete concerns or gaps worth probing further, one per entry. */
  areasOfConcern: string[];
  /** How well the referees' accounts agree with each other — blank when fewer than two have responded. */
  consistencyNotes: string;
  /** Questions a TA could ask in a follow-up call to resolve gaps or thin answers. */
  suggestedFollowUps: string[];
  /**
   * One-sentence headline per referee, index-aligned with ReferenceCheck.referees
   * (empty string for a referee who hasn't responded). Was two named fields
   * (referee1Takeaway/referee2Takeaway) before the variable-referee-count change —
   * see the read-side fallback in mappers.ts for historical records.
   */
  refereeTakeaways: string[];
  /** When this was generated — drives "Refresh" vs "Generate" on the dashboard card. */
  generatedAt: string;
}

export interface ReferenceCheck {
  id: string;
  refId: string;
  candidateId: string;
  /** 2 to 4 referees, in the order they were added. Was fixed referee1/referee2 fields before this could vary. */
  referees: RefereeStatus[];
  outcome: "Pending" | "Positive" | "Negative" | "Mixed";
  driveFolderUrl: string | null;
  createdAt: string;
  source: ReferenceCheckSource;
  status: ReferenceCheckStatus;
  /** When a TA confirmed a candidate-submitted record's referee details. Null for TA-added (self-verified) or not-yet-verified records. */
  verifiedAt: string | null;
  verifiedBy: string | null;
  /** When referee emails actually went out — anchors the 24h reminder automation. Null until verified/sent. */
  initiatedAt: string | null;
  /** Persisted AI analysis, null until generated (or if generation has never succeeded). */
  aiInsights: ReferenceCheckAiInsights | null;
}

export interface Offer {
  id: string;
  offerId: string;
  candidateId: string;
  offeredSalary: number;
  budgetedSalary: number;
  dateSent: string;
  deadline: string;
  outcome: OfferOutcome;
  counterOfferAmount?: number;
  finalAcceptedSalary?: number;
  startDate?: string;
  joined: JoinStatus;
  dropReason?: string;
}

export interface NewEmployee {
  id: string;
  employeeId: string;
  candidateId: string;
  name: string;
  role: string;
  department: string;
  branchId: string;
  startDate: string;
  employmentType: EmploymentType;
  contractEnd?: string;
  confirmation6mo?: "Pending" | "Confirmed" | "Not Confirmed";
  confirmation6moAt?: string;
  requisitionSubmitterName?: string;
  requisitionSubmitterEmail?: string;
}

export interface Reliever {
  id: string;
  relieverId?: string;
  name: string;
  role: string;
  branchesCovered: string[];
  /** YYYY-MM-DD start date for permanent relievers (replaces availability window) */
  startDate?: string;
  email?: string;
  status: "Active" | "Inactive";
  phone: string;
  notes?: string;
}

export interface Locum {
  id: string;
  locumId?: string;
  name: string;
  speciality: string;
  branchesCovered: string[];
  dailyRate: number;
  licenseNumber: string;
  availability: string;
  lastDeployed?: string;
}

/**
 * One branch+cadre's confirmed real-world headcount for a given month —
 * the ground truth the Staffing Projections page can't derive from
 * anywhere else in the system (attrition, informal transfers, maternity
 * leave exclusions aren't tracked by hcFilled). Entered by People Ops.
 * Required HC for the same branch+cadre+month is deliberately NOT stored
 * here — it's derived live from Open Roles' hcApproved so the two can
 * never drift apart. See src/lib/staffing/compute.ts.
 */
export interface StaffingProjection {
  id: string;
  /** First-of-month date, e.g. "2026-09-01" */
  month: string;
  branchId?: string;
  cadre: Cadre;
  currentStaffingHc: number;
  notes?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AutomationLogEntry {
  id: string;
  trigger: string;
  entityType: "Candidate" | "Requisition" | "WorkTrial" | "ReferenceCheck" | "Offer";
  entityId: string;
  channel: "Email" | "SMS" | "Drive" | "Sheets" | "Airtable";
  status: "Success" | "Failed" | "Retrying";
  detail: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRoleName;
  /** Free text — what this person's actual title is, not a permission tier. */
  jobTitle?: string;
  phone?: string;
  /** Airtable Branch record ID (e.g. "recXXXX") — only set for branch_manager. No FK; Branches live in Airtable, not Postgres. */
  branchId?: string;
  dashboardDefault?: DashboardDefaultView;
  emailNotifications?: EmailNotificationPreference;
}
