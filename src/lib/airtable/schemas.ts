// Runtime validation for API request bodies before they're written to
// Airtable. One schema per resource, matching the shape `toAirtable()` in
// mappers.ts expects. POST validates the full schema; PATCH validates
// `schema.partial()` since patches only send changed fields.
import { z } from "zod";

const segment = z.enum(["IPS", "SO"]);
const priority = z.enum(["Critical", "High", "Medium", "Low"]);
const cadre = z.enum(["CC", "Labtech", "Nurse", "Pharmtech", "Clinical Officer"]);

export const branchSchema = z.object({
  branchId: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(150),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  branchManager: z.string().trim().min(1).max(150),
  // Optional: a plain z.object() PATCH schema silently strips any key it
  // doesn't declare (Zod's default "strip unknown keys" behavior), so a
  // field missing here doesn't fail loudly — it just never reaches
  // Airtable while the client's optimistic UI update makes it *look*
  // saved. bmEmail/bmPhone/address/mapPinUrl were missing for exactly
  // that reason (BM contact edits from Settings were silently dropped);
  // keep every editable Branch field declared here, even ones that are
  // "" by default and not required by the form's own validation.
  bmEmail: z.string().trim().max(255).optional(),
  bmPhone: z.string().trim().max(30).optional(),
  regionalManager: z.string().trim().min(1).max(150),
  capacity: z.number().int().min(0).max(1000),
  active: z.boolean(),
  workTrialActive: z.boolean().optional(),
  address: z.string().trim().max(500).optional(),
  mapPinUrl: z.string().trim().max(2000).optional(),
  expansionBranch: z.boolean().optional(),
  segment,
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
  // Full multi-branch link list for a "group" role split across several
  // branches at once — see OpenRole.branchIds. Optional/empty is valid: a
  // normal single-branch role never sets this, and closing a group role's
  // last gap clears it back to [].
  branchIds: z.array(z.string().max(100)).optional(),
  priority,
  status: z.enum(["Open", "Allocated", "Filled", "On Hold", "Cancelled"]),
  // 0.5 increments, not just whole numbers — some roles are shared across
  // two clustered branches, so a single branch's slice of the headcount can
  // legitimately be e.g. 0.5.
  hcApproved: z.number().multipleOf(0.5).min(0).max(500),
  hcFilled: z.number().multipleOf(0.5).min(0).max(500),
  recruiter: z.string().trim().min(1).max(150),
  hiringManager: z.string().trim().min(1).max(150),
  hiringManagerEmail: z.string().trim().max(255).email().optional(),
  datePosted: z.string().max(40),
  dateClosed: z.string().max(40).nullable().optional(),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Reliever", "Locum"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  internalFill: z.boolean().optional(),
  internalFillName: z.string().trim().max(150).optional(),
  replacementRequisitionId: z.string().max(50).optional(),
  requisitionId: z.string().max(50).optional(),
  requisitionSubmitterName: z.string().trim().max(150).optional(),
  requisitionSubmitterEmail: z.string().trim().max(255).optional(),
  cadre: cadre.optional(),
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
  // These are written directly via updateRecord() from bm-feedback-form.ts,
  // bypassing this schema entirely (same pattern as referee-form.ts) — so
  // their absence here has never been a live bug. Declared anyway so a
  // future dashboard edit affordance that *does* go through the generic
  // PATCH /api/work-trials/[id] route doesn't silently drop them, the way
  // Branch's bmEmail/bmPhone/address/mapPinUrl did.
  submittedByRole: z.enum(["BM", "Incharge"]).nullable().optional(),
  bmApprovedAt: z.string().max(40).nullable().optional(),
  commentCulture: z.string().trim().max(2000).optional(),
  commentPatient: z.string().trim().max(2000).optional(),
  commentTechnical: z.string().trim().max(2000).optional(),
  strengths: z.string().trim().max(2000).optional(),
  areasOfDevelopment: z.string().trim().max(2000).optional(),
  overallRecommendation: z.string().trim().max(2000).optional(),
  submissionMethod: z.enum(["Online", "Uploaded"]).nullable().optional(),
  uploadedFormFiles: z.array(z.object({ url: z.string().max(2000), filename: z.string().max(300) })).optional(),
  roleCategory: z.enum(["General", "Specialist"]).optional(),
  specialty: z.string().trim().max(150).optional(),
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
  directlySupervised: z.boolean().optional(),
  reportingRelationship: z
    .enum([
      "Reported directly to me",
      "Reported to someone else, but I worked closely with them",
      "We were peers / colleagues",
      "I reported to them",
    ])
    .optional(),
  refereeOrganization: z.string().trim().max(150).optional(),
  durationKnown: z.string().trim().max(100).optional(),
  interactionFrequency: z.enum(["Daily", "A few times a week", "Weekly", "A few times a month", "Rarely"]).optional(),
  jobTitleRecalled: z.string().trim().max(150).optional(),
  employmentFrom: z.string().max(40).optional(),
  employmentTo: z.string().max(40).optional(),
  stillEmployed: z.boolean().optional(),
  mainResponsibilities: z.string().trim().max(2000).optional(),
  reportedTo: z.string().trim().max(150).optional(),
  leavingReason: z
    .enum(["Still employed there", "Resigned", "Contract ended", "Laid off / restructuring", "Terminated", "Not sure"])
    .optional(),
  techScore: z.number().min(0).max(5).optional(),
  reliabilityScore: z.number().min(0).max(5).optional(),
  executionScore: z.number().min(0).max(5).optional(),
  executionExample: z.string().trim().max(3000).optional(),
  teamworkScore: z.number().min(0).max(5).optional(),
  teamworkExample: z.string().trim().max(3000).optional(),
  communicationScore: z.number().min(0).max(5).optional(),
  communicationExample: z.string().trim().max(3000).optional(),
  problemSolvingScore: z.number().min(0).max(5).optional(),
  adaptabilityScore: z.number().min(0).max(5).optional(),
  wouldRehire: z
    .enum([
      // Current redesign — what the /referee form now offers/writes.
      "Yes",
      "With reservations",
      "No",
      // Legacy values from two earlier generations of this form — still
      // valid on old records.
      "Yes, without hesitation",
      "Yes, with reservations",
      "Unsure",
      "Yes, with some reservations",
      "No, I would not recommend them",
    ])
    .optional(),
  wouldRehireExplanation: z.string().trim().max(2000).optional(),
  strengthExample: z.string().trim().max(3000).optional(),
  developmentAreas: z.string().trim().max(3000).optional(),
  strengthsAndDevelopment: z.string().trim().max(3000).optional(),
  topStrengths: z.string().trim().max(2000).optional(),
  coachingArea: z.string().trim().max(2000).optional(),
  feedbackResponse: z.enum(["Openly, and applied it", "Mixed", "Defensively"]).optional(),
  conflictExample: z.string().trim().max(3000).optional(),
  honestyConcerns: z.enum(["No concerns", "Some concerns", "Prefer to discuss by phone"]).optional(),
  complianceIncidents: z.enum(["None that I know of", "Yes", "Prefer to discuss by phone"]).optional(),
  licenseStanding: z.enum(["Yes", "No", "N/A", "Not sure"]).optional(),
  preferPhoneNumber: z.string().trim().max(30).optional(),
  overallRecommendScore: z.number().min(0).max(5).optional(),
  recommendHire: z.enum(["Strongly Recommend", "Recommend", "Recommend with Reservations", "Do Not Recommend"]).optional(),
  consentToContact: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
  googleVerified: z.boolean().optional(),
  googleVerifiedEmail: z.string().trim().max(255).optional(),
  googleVerifiedOverrideBy: z.string().trim().max(150).optional(),
  reminder24hSent: z.boolean().optional(),
  reminder48hSent: z.boolean().optional(),
  draftJson: z.string().max(20000).optional(),
});

export const referenceCheckSchema = z.object({
  refId: z.string().max(30).optional(),
  candidateId: z.string().min(1).max(30),
  referees: z.array(refereeStatusSchema).min(2).max(4),
  outcome: z.enum(["Pending", "Positive", "Negative", "Mixed"]),
  driveFolderUrl: z.string().max(2000).nullable(),
  createdAt: z.string().max(40),
  source: z.enum(["TA Added", "Candidate Submitted"]),
  status: z.enum(["Awaiting Verification", "Awaiting Responses", "1 Referee In", "Ready for Offer"]),
  verifiedAt: z.string().max(40).nullable(),
  verifiedBy: z.string().trim().max(150).nullable(),
  initiatedAt: z.string().max(40).nullable(),
  reportPdfUrl: z.string().max(2000).nullable().optional(),
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

export const staffingProjectionSchema = z.object({
  month: z.string().min(1).max(40),
  branchId: z.string().max(100).optional(),
  cadre,
  currentStaffingHc: z.number().multipleOf(0.5).min(0).max(500),
  notes: z.string().trim().max(2000).optional(),
  updatedBy: z.string().trim().max(150).optional(),
  updatedAt: z.string().max(40).optional(),
});
