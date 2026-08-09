// Runtime validation for API request bodies before they're written to
// Airtable. One schema per resource, matching the shape `toAirtable()` in
// mappers.ts expects. POST validates the full schema; PATCH validates
// `schema.partial()` since patches only send changed fields.
import { z } from "zod";

const segment = z.enum(["IPS", "SO"]);
const priority = z.enum(["Critical", "High", "Medium", "Low"]);

export const branchSchema = z.object({
  branchId: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(150),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  branchManager: z.string().trim().min(1).max(150),
  regionalManager: z.string().trim().min(1).max(150),
  capacity: z.number().int().min(0).max(1000),
  active: z.boolean(),
});

export const requisitionSchema = z.object({
  reqId: z.string().max(30).optional(),
  type: z.enum(["SO New Role", "SO Replacement", "IPS Gap"]),
  roleTitle: z.string().trim().min(1).max(200),
  department: z.string().trim().min(1).max(200),
  segment,
  gapReason: z.enum(["Transfer", "Promotion", "Voluntary Resignation", "Termination", "New Addition"]).optional(),
  reasonType: z.enum(["Resignation", "Termination", "Internal Promotion", "Retirement", "Contract End", "Other"]).optional(),
  branchId: z.string().max(100).optional(),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]).optional(),
  level: z.enum(["Entry", "Junior", "Mid", "Senior", "Lead", "Manager", "Senior Manager", "Head/Director"]).optional(),
  headcount: z.number().int().min(1).max(500),
  justification: z.string().trim().min(1).max(3000),
  salaryRangeMin: z.number().min(0).max(100_000_000).optional(),
  salaryRangeMax: z.number().min(0).max(100_000_000).optional(),
  urgency: priority,
  jdAttached: z.boolean(),
  jdUrl: z.string().trim().max(2000).optional(),
  status: z.enum(["Pending Approval", "Approved", "Rejected", "Converted to Open Role"]),
  approverChain: z.array(z.string().max(200)).max(20),
  currentApproverIndex: z.number().int().min(0).max(20),
  submittedBy: z.string().trim().min(1).max(150),
  submittedAt: z.string().max(40),
  expectedStartDate: z.string().max(40).optional(),
  context: z.string().trim().max(3000).optional(),
  submitterName: z.string().trim().max(150).optional(),
  submitterEmail: z.string().trim().max(255).optional(),
  submitterRole: z.string().trim().max(150).optional(),
  source: z.enum(["internal", "public-link"]).optional(),
  budgetEvaluationConfirmed: z.boolean().optional(),
});

const PENDA_EMAIL_DOMAIN = "@pendahealth.com";

// Stricter schema for the unauthenticated /api/public/requisition-request
// endpoint: submitter identity fields are required here (optional on the
// base schema above since the logged-in flow doesn't collect them), and the
// email domain is enforced server-side too, mirroring the client-side check.
export const publicRequisitionRequestSchema = requisitionSchema
  .omit({
    status: true,
    approverChain: true,
    currentApproverIndex: true,
    submittedBy: true,
    submittedAt: true,
    source: true,
    submitterName: true,
    submitterEmail: true,
    submitterRole: true,
  })
  .extend({
    submitterName: z.string().trim().min(1, "Name is required").max(150),
    submitterEmail: z
      .string()
      .trim()
      .max(255)
      .email("Enter a valid email")
      .toLowerCase()
      .refine((email) => email.endsWith(PENDA_EMAIL_DOMAIN), {
        message: `Email must be a ${PENDA_EMAIL_DOMAIN} address`,
      }),
    submitterRole: z.string().trim().min(1, "Role is required").max(150),
    honeypot: z.string().max(0).optional(),
  });

export const openRoleSchema = z.object({
  roleId: z.string().max(30).optional(),
  title: z.string().trim().min(1).max(200),
  segment,
  department: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(300),
  branchId: z.string().max(100).optional(),
  priority,
  status: z.enum(["Open", "Allocated", "Filled", "On Hold", "Cancelled"]),
  hcApproved: z.number().int().min(0).max(500),
  hcFilled: z.number().int().min(0).max(500),
  recruiter: z.string().trim().min(1).max(150),
  hiringManager: z.string().trim().min(1).max(150),
  hiringManagerEmail: z.string().trim().max(255).email().optional(),
  datePosted: z.string().max(40),
  dateClosed: z.string().max(40).nullable().optional(),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  internalFill: z.boolean().optional(),
  internalFillName: z.string().trim().max(150).optional(),
  requisitionId: z.string().max(50).optional(),
  requisitionSubmitterName: z.string().trim().max(150).optional(),
  requisitionSubmitterEmail: z.string().trim().max(255).optional(),
});

export const candidateSchema = z.object({
  candId: z.string().max(30).optional(),
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(30),
  email: z.string().trim().max(255).email(),
  roleId: z.string().max(30).optional(),
  segment: z.enum(["IPS", "SO"]).optional(),
  department: z.string().trim().max(200).optional(),
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
  source: z.string().trim().min(1).max(150),
  gender: z.enum(["Male", "Female"]),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]),
  referee1: z
    .object({ name: z.string().trim().max(150), email: z.string().trim().max(255), phone: z.string().trim().max(30) })
    .optional(),
  referee2: z
    .object({ name: z.string().trim().max(150), email: z.string().trim().max(255), phone: z.string().trim().max(30) })
    .optional(),
  workTrialStatus: z.enum(["Scheduled", "Awaiting Arrival", "Awaiting Score", "Complete"]).optional(),
  refCheckStatus: z.string().max(100).optional(),
  offerStatus: z.enum(["Pending", "Accepted", "Declined", "Negotiating", "Withdrawn"]).optional(),
  joined: z.enum(["Pending", "Joined", "Did Not Join"]).optional(),
  stageEnteredAt: z.string().max(40),
  createdAt: z.string().max(40),
});

export const interviewSchema = z.object({
  schedId: z.string().max(30).optional(),
  candidateId: z.string().min(1).max(30),
  roleId: z.string().min(1).max(30),
  date: z.string().min(1).max(40),
  time: z.string().min(1).max(20),
  weekLabel: z.string().max(40),
  month: z.string().max(20),
  stage: z.enum(["First Interview", "Second Interview", "Panel Interview"]),
  type: z.enum(["In-person", "Google Meet", "Phone", "WhatsApp"]),
  location: z.string().trim().min(1).max(300),
  interviewers: z.array(z.string().max(150)).max(20),
  confirmed: z.boolean(),
  reminderSent: z.boolean(),
  attendance: z.enum(["Attended", "No-show", "Pending"]),
  outcome: z.enum(["Pass", "Fail", "Pending"]),
  notes: z.string().trim().max(2000).optional(),
});

export const workTrialSchema = z.object({
  wtId: z.string().max(30).optional(),
  candidateId: z.string().min(1).max(30),
  roleId: z.string().max(30).optional(),
  branchId: z.string().max(100).optional(),   // optional — auto-created trials may not have branch yet
  date: z.string().min(1).max(40),
  supervisor: z.string().trim().max(150).optional(), // optional — assigned after scheduling
  createdAt: z.string().max(40).optional(),
  arrivalMarked: z.boolean().nullable(),
  scoreTechnical: z.number().min(0).max(100).nullable(),
  scorePatient: z.number().min(0).max(100).nullable(),
  scoreSafety: z.number().min(0).max(100).nullable(),
  scoreCulture: z.number().min(0).max(100).nullable(),
  total: z.number().min(0).max(100).nullable(),
  passFail: z.enum(["Pass", "Fail", "Pending"]),
  formSubmittedAt: z.string().max(40).nullable(),
  reminder12hSent: z.boolean(),
  escalation24hSent: z.boolean(),
});

const refereeStatusSchema = z.object({
  name: z.string().trim().max(150),
  email: z.string().trim().max(255),
  phone: z.string().trim().max(30),
  emailSent: z.boolean(),
  smsSent: z.boolean(),
  responded: z.boolean(),
  respondedAt: z.string().max(40).optional(),
  relationship: z.string().trim().max(100).optional(),
  durationKnown: z.string().trim().max(100).optional(),
  techScore: z.number().min(0).max(5).optional(),
  reliabilityScore: z.number().min(0).max(5).optional(),
  teamworkScore: z.number().min(0).max(5).optional(),
  wouldRehire: z
    .enum(["Yes, without hesitation", "Yes, with some reservations", "No, I would not recommend them"])
    .optional(),
  strengthExample: z.string().trim().max(3000).optional(),
  developmentAreas: z.string().trim().max(3000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const referenceCheckSchema = z.object({
  refId: z.string().max(30).optional(),
  candidateId: z.string().min(1).max(30),
  referee1: refereeStatusSchema,
  referee2: refereeStatusSchema,
  outcome: z.enum(["Pending", "Positive", "Negative", "Mixed"]),
  driveFolderUrl: z.string().max(2000).nullable(),
  createdAt: z.string().max(40),
});

export const offerSchema = z.object({
  offerId: z.string().max(30).optional(),
  candidateId: z.string().min(1).max(30),
  offeredSalary: z.number().min(0).max(100_000_000),
  budgetedSalary: z.number().min(0).max(100_000_000),
  dateSent: z.string().max(40),
  deadline: z.string().max(40),
  outcome: z.enum(["Pending", "Accepted", "Declined", "Negotiating", "Withdrawn"]),
  counterOfferAmount: z.number().min(0).max(100_000_000).optional(),
  finalAcceptedSalary: z.number().min(0).max(100_000_000).optional(),
  startDate: z.string().max(40).optional(),
  joined: z.enum(["Pending", "Joined", "Did Not Join"]),
  dropReason: z.string().trim().max(1000).optional(),
});

export const newEmployeeSchema = z.object({
  employeeId: z.string().max(30).optional(),
  candidateId: z.string().min(1).max(30),
  name: z.string().trim().min(1).max(150),
  role: z.string().trim().min(1).max(200),
  department: z.string().trim().min(1).max(200),
  branchId: z.string().min(1).max(100),
  startDate: z.string().min(1).max(40),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]),
  contractEnd: z.string().max(40).optional(),
  confirmation6mo: z.enum(["Pending", "Confirmed", "Not Confirmed"]).optional(),
  confirmation6moAt: z.string().max(40).optional(),
  requisitionSubmitterName: z.string().trim().max(150).optional(),
  requisitionSubmitterEmail: z.string().trim().max(255).optional(),
});

export const relieverSchema = z.object({
  relieverId: z.string().max(30).optional(),
  name: z.string().trim().min(1).max(150),
  role: z.string().trim().min(1).max(150),
  // Branches can be assigned later from the pool view
  branchesCovered: z.array(z.string().max(100)).max(50).optional(),
  startDate: z.string().max(40).optional(),
  email: z.string().email().max(200).optional(),
  status: z.enum(["Active", "Inactive"]),
  phone: z.string().trim().min(1).max(30),
  notes: z.string().trim().max(2000).optional(),
});

export const locumSchema = z.object({
  locumId: z.string().max(30).optional(),
  name: z.string().trim().min(1).max(150),
  speciality: z.string().trim().min(1).max(150),
  branchesCovered: z.array(z.string().max(100)).max(50),
  dailyRate: z.number().min(0).max(1_000_000),
  licenseNumber: z.string().trim().min(1).max(100),
  availability: z.string().trim().min(1).max(300),
  lastDeployed: z.string().max(40).optional(),
});
