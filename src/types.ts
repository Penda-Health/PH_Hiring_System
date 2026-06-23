// Core enums

export type Segment = "IPS" | "SO";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export type RoleStatus = "Open" | "Filled" | "On Hold" | "Cancelled";

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

export type UserRoleName =
  | "Recruiter"
  | "TA Manager"
  | "Hiring Manager"
  | "HRBP"
  | "Regional Manager"
  | "Branch Manager"
  | "Director, People & Culture"
  | "HR Ops"
  | "Admin";

// Entities — mirror the 11 linked Airtable tables

export interface Branch {
  id: string;
  branchId: string;
  name: string;
  city: string;
  region: string;
  branchManager: string;
  regionalManager: string;
  capacity: number;
  active: boolean;
}

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
}

export interface OpenRole {
  id: string;
  roleId: string;
  title: string;
  segment: Segment;
  department: string;
  location: string;
  branchId?: string;
  priority: Priority;
  status: RoleStatus;
  hcApproved: number;
  hcFilled: number;
  recruiter: string;
  hiringManager: string;
  datePosted: string;
  requisitionId?: string;
}

export interface Candidate {
  id: string;
  candId: string;
  name: string;
  phone: string;
  email: string;
  roleId: string;
  stage: CandidateStage;
  source: string;
  gender: "Male" | "Female";
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
  branchId: string;
  date: string;
  supervisor: string;
  arrivalMarked: boolean | null;
  scoreTechnical: number | null;
  scorePatient: number | null;
  scoreSafety: number | null;
  scoreCulture: number | null;
  total: number | null;
  passFail: "Pass" | "Fail" | "Pending";
  formSubmittedAt: string | null;
  reminder12hSent: boolean;
  escalation24hSent: boolean;
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
}

export interface Reliever {
  id: string;
  name: string;
  role: string;
  branchesCovered: string[];
  availabilityDates: string;
  status: "Active" | "Inactive";
  phone: string;
  notes?: string;
}

export interface Locum {
  id: string;
  name: string;
  speciality: string;
  branchesCovered: string[];
  dailyRate: number;
  licenseNumber: string;
  availability: string;
  lastDeployed?: string;
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
  branchId?: string;
}
