export const CANDIDATE_SOURCES = [
  "ATS Applicant",
  "Self Referral",
  "Referral",
  "LinkedIn",
  "BrighterMonday",
  "Fuzu",
  "SeamlessHR",
  "Social Media",
  "Walk-in",
  "Internal Transfer",
  "Agency",
  "Direct Application",
  "Other",
] as const;

export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];
