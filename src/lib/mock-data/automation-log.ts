import { AutomationLogEntry } from "@/types";

export const automationLog: AutomationLogEntry[] = [
  { id: "log-1", trigger: "Stage → First Interview", entityType: "Candidate", entityId: "cand-1", channel: "Email", status: "Success", detail: "Confirmation email + calendar invite sent", timestamp: "2026-06-15T08:02:00" },
  { id: "log-2", trigger: "1 day before interview", entityType: "Candidate", entityId: "cand-2", channel: "SMS", status: "Success", detail: "Reminder SMS sent to candidate", timestamp: "2026-06-20T08:00:00" },
  { id: "log-3", trigger: "Stage → Work Trial", entityType: "Candidate", entityId: "cand-12", channel: "Email", status: "Success", detail: "Branch selection form emailed", timestamp: "2026-06-17T09:15:00" },
  { id: "log-4", trigger: "12hrs after trial — form not submitted", entityType: "WorkTrial", entityId: "wt-2", channel: "Email", status: "Success", detail: "Reminder email sent to Dr. Wanjiru", timestamp: "2026-06-19T20:30:00" },
  { id: "log-5", trigger: "24hrs after trial — form not submitted", entityType: "WorkTrial", entityId: "wt-4", channel: "Email", status: "Success", detail: "Escalation email sent to TA Manager", timestamp: "2026-06-15T09:10:00" },
  { id: "log-6", trigger: "Stage → Reference Check", entityType: "Candidate", entityId: "cand-16", channel: "Drive", status: "Success", detail: "Candidate subfolder created in June 2026 folder", timestamp: "2026-06-16T10:00:00" },
  { id: "log-7", trigger: "48hrs — referee no response", entityType: "ReferenceCheck", entityId: "ref-2", channel: "Email", status: "Retrying", detail: "Reminder email queued for non-responding referee", timestamp: "2026-06-19T11:00:00" },
  { id: "log-8", trigger: "Offer outcome → Accepted", entityType: "Offer", entityId: "offer-3", channel: "Sheets", status: "Success", detail: "New employee row synced to Google Sheet", timestamp: "2026-05-20T16:00:00" },
];
