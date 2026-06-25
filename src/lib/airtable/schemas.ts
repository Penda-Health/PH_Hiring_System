// Runtime validation for API request bodies before they're written to
// Airtable. One schema per resource, matching the shape `toAirtable()` in
// mappers.ts expects. POST validates the full schema; PATCH validates
// `schema.partial()` since patches only send changed fields.
import { z } from "zod";

const segment = z.enum(["IPS", "SO"]);
const priority = z.enum(["Critical", "High", "Medium", "Low"]);

export const branchSchema = z.object({
  branchId: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1),
  branchManager: z.string().min(1),
  regionalManager: z.string().min(1),
  capacity: z.number(),
  active: z.boolean(),
});

export const requisitionSchema = z.object({
  reqId: z.string().optional(),
  type: z.enum(["SO New Role", "SO Replacement", "IPS Gap"]),
  roleTitle: z.string().min(1),
  department: z.string().min(1),
  segment,
  gapReason: z.enum(["Transfer", "Promotion", "Voluntary Resignation", "Termination", "New Addition"]).optional(),
  reasonType: z.enum(["Resignation", "Termination", "Internal Promotion", "Retirement", "Contract End", "Other"]).optional(),
  branchId: z.string().optional(),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]).optional(),
  level: z.enum(["Entry", "Junior", "Mid", "Senior", "Lead", "Manager", "Senior Manager", "Head/Director"]).optional(),
  headcount: z.number(),
  justification: z.string().min(1),
  salaryRangeMin: z.number().optional(),
  salaryRangeMax: z.number().optional(),
  urgency: priority,
  jdAttached: z.boolean(),
  jdUrl: z.string().optional(),
  status: z.enum(["Pending Approval", "Approved", "Rejected", "Converted to Open Role"]),
  approverChain: z.array(z.string()),
  currentApproverIndex: z.number(),
  submittedBy: z.string().min(1),
  submittedAt: z.string(),
  expectedStartDate: z.string().optional(),
  context: z.string().optional(),
});

export const openRoleSchema = z.object({
  roleId: z.string().min(1),
  title: z.string().min(1),
  segment,
  department: z.string().min(1),
  location: z.string().min(1),
  branchId: z.string().optional(),
  priority,
  status: z.enum(["Open", "Allocated", "Filled", "On Hold", "Cancelled"]),
  hcApproved: z.number(),
  hcFilled: z.number(),
  recruiter: z.string().min(1),
  hiringManager: z.string().min(1),
  datePosted: z.string(),
  dateClosed: z.string().optional(),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]).optional(),
  notes: z.string().optional(),
  requisitionId: z.string().optional(),
});

export const candidateSchema = z.object({
  candId: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  roleId: z.string().min(1),
  stage: z.enum([
    "First Interview",
    "Second Interview",
    "Panel Interview",
    "Work Trial",
    "Reference Check",
    "Offer",
    "Hired",
    "Backup Pool",
    "Rejected",
    "Withdrawn",
  ]),
  source: z.string().min(1),
  gender: z.enum(["Male", "Female"]),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]),
  referee1: z.object({ name: z.string(), email: z.string(), phone: z.string() }).optional(),
  referee2: z.object({ name: z.string(), email: z.string(), phone: z.string() }).optional(),
  workTrialStatus: z.enum(["Scheduled", "Awaiting Arrival", "Awaiting Score", "Complete"]).optional(),
  refCheckStatus: z.string().optional(),
  offerStatus: z.enum(["Pending", "Accepted", "Declined", "Negotiating", "Withdrawn"]).optional(),
  joined: z.enum(["Pending", "Joined", "Did Not Join"]).optional(),
  stageEnteredAt: z.string(),
  createdAt: z.string(),
});

export const interviewSchema = z.object({
  schedId: z.string().optional(),
  candidateId: z.string().min(1),
  roleId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  weekLabel: z.string(),
  month: z.string(),
  stage: z.enum(["First Interview", "Second Interview", "Panel Interview"]),
  type: z.enum(["In-person", "Google Meet", "Phone", "WhatsApp"]),
  location: z.string().min(1),
  interviewers: z.array(z.string()),
  confirmed: z.boolean(),
  reminderSent: z.boolean(),
  attendance: z.enum(["Attended", "No-show", "Pending"]),
  outcome: z.enum(["Pass", "Fail", "Pending"]),
  notes: z.string().optional(),
});

export const workTrialSchema = z.object({
  wtId: z.string().optional(),
  candidateId: z.string().min(1),
  branchId: z.string().min(1),
  date: z.string().min(1),
  supervisor: z.string().min(1),
  arrivalMarked: z.boolean().nullable(),
  scoreTechnical: z.number().nullable(),
  scorePatient: z.number().nullable(),
  scoreSafety: z.number().nullable(),
  scoreCulture: z.number().nullable(),
  total: z.number().nullable(),
  passFail: z.enum(["Pass", "Fail", "Pending"]),
  formSubmittedAt: z.string().nullable(),
  reminder12hSent: z.boolean(),
  escalation24hSent: z.boolean(),
});

const refereeStatusSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  emailSent: z.boolean(),
  smsSent: z.boolean(),
  responded: z.boolean(),
  respondedAt: z.string().optional(),
});

export const referenceCheckSchema = z.object({
  refId: z.string().optional(),
  candidateId: z.string().min(1),
  referee1: refereeStatusSchema,
  referee2: refereeStatusSchema,
  outcome: z.enum(["Pending", "Positive", "Negative", "Mixed"]),
  driveFolderUrl: z.string().nullable(),
  createdAt: z.string(),
});

export const offerSchema = z.object({
  offerId: z.string().optional(),
  candidateId: z.string().min(1),
  offeredSalary: z.number(),
  budgetedSalary: z.number(),
  dateSent: z.string(),
  deadline: z.string(),
  outcome: z.enum(["Pending", "Accepted", "Declined", "Negotiating", "Withdrawn"]),
  counterOfferAmount: z.number().optional(),
  finalAcceptedSalary: z.number().optional(),
  startDate: z.string().optional(),
  joined: z.enum(["Pending", "Joined", "Did Not Join"]),
  dropReason: z.string().optional(),
});

export const newEmployeeSchema = z.object({
  employeeId: z.string().optional(),
  candidateId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  department: z.string().min(1),
  branchId: z.string().min(1),
  startDate: z.string().min(1),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]),
  contractEnd: z.string().optional(),
});

export const relieverSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  branchesCovered: z.array(z.string()),
  availabilityDates: z.string().min(1),
  status: z.enum(["Active", "Inactive"]),
  phone: z.string().min(1),
  notes: z.string().optional(),
});

export const locumSchema = z.object({
  name: z.string().min(1),
  speciality: z.string().min(1),
  branchesCovered: z.array(z.string()),
  dailyRate: z.number(),
  licenseNumber: z.string().min(1),
  availability: z.string().min(1),
  lastDeployed: z.string().optional(),
});
