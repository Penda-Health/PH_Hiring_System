"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequisitionTable } from "@/components/requisitions/requisition-table";
import { NewRequisitionDialog } from "@/components/requisitions/new-requisition-dialog";
import { CopyPublicLinkMenu } from "@/components/requisitions/copy-public-link-menu";

export default function RequisitionsPage() {
  const { user } = useAuth();
  const { requisitions, branches, createRequisition, approveRequisition, rejectRequisition, canEdit } =
    useRecruitmentData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Requisition Intake</h1>
        <div className="flex items-center gap-2">
          {canEdit && <CopyPublicLinkMenu />}
          <Button variant="outline" asChild>
            <Link href="/requisitions/new/ips">New IPS Gap Form</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/requisitions/new/so">New SO Requisition Form</Link>
          </Button>
          <NewRequisitionDialog onCreate={createRequisition} submittedBy={user?.name ?? "Unknown"} branches={branches} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <RequisitionTable
            requisitions={requisitions}
            branches={branches}
            onApprove={approveRequisition}
            onReject={rejectRequisition}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
