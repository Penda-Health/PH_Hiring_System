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
   * Airtable link order. Read-only: populated from Airtable, not written
   * back (the app doesn't yet have UI to create/edit a multi-branch role).
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

export type RehireAnswer = "Yes, without hesitation" | "Yes, with some reservations" | "No, I would not recommend them";

export interface RefereeStatus {
  name: string;
  email: string;
  phone: string;
  emailSent: boolean;
  smsSent: boolean;
  responded: boolean;
  respondedAt?: string;
  relationship?: string;
  durationKnown?: string;
  techScore?: number;
  reliabilityScore?: number;
  teamworkScore?: number;
  wouldRehire?: RehireAnswer;
  strengthExample?: string;
  developmentAreas?: string;
  notes?: string;
}

export interface ReferenceCheck {
  id: string;
  refId: string;
  candidateId: string;
  referee1: RefereeStatus;
  referee2: RefereeStatus;
  outcome: "Pending" | "Positive" | "Negative" | "Mixed";
  driveFolderUrl: string | null;
  createdAt: string;
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
