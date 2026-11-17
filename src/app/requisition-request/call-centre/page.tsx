"use client";

// Public link for the call centre to raise a staffing gap. It's filed as an
// SO request in the "Pigia Penda / Call Centre" department and walks the
// Call Centre chain from Settings → Requisition approvals (BM → HRBP, who
// confirms the gap → RM).
import { GapRequestForm } from "@/components/requisitions/gap-request-form";

export default function PublicCallCentreRequisitionRequestPage() {
  return <GapRequestForm variant="call-centre" />;
}
