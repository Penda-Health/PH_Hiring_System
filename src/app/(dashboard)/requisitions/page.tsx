"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { Card, CardContent } from "@/components/ui/card";
import { RequisitionTable } from "@/components/requisitions/requisition-table";
import { NewRequisitionDialog } from "@/components/requisitions/new-requisition-dialog";

export default function RequisitionsPage() {
  const { user } = useAuth();
  const { requisitions, branches, createRequisition, approveRequisition, rejectRequisition } = useRecruitmentData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Requisition Intake</h1>
        <NewRequisitionDialog onCreate={createRequisition} submittedBy={user?.name ?? "Unknown"} branches={branches} />
      </div>
      <Card>
        <CardContent className="p-0">
          <RequisitionTable
            requisitions={requisitions}
            branches={branches}
            onApprove={approveRequisition}
            onReject={rejectRequisition}
          />
        </CardContent>
      </Card>
    </div>
  );
}
