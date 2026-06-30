"use client";

import * as React from "react";
import {
  Branch,
  Requisition,
  OpenRole,
  Interview,
  WorkTrial,
  ReferenceCheck,
  Offer,
  Candidate,
  NewEmployee,
  Reliever,
  Locum,
} from "@/types";
import { computeWeightedTotal, PASS_THRESHOLD } from "@/lib/work-trial-helpers";
import { buildOpenRoleFromRequisition } from "@/lib/requisitions-helpers";
import { listResource, createResource, updateResource } from "@/lib/airtable/browser-api";
import { useAuth } from "@/lib/auth/auth-context";
import { canEditRecruitmentData } from "@/lib/permissions";

type RecruitmentDataContextValue = {
  loading: boolean;
  error: string | null;
  /** Recruitment User/Manager only — Branch Manager and Contributor are view-only. UI affordance; the real check is server-side in middleware. */
  canEdit: boolean;

  branches: Branch[];
  openRoles: OpenRole[];
  updateOpenRoleStatus: (id: string, status: OpenRole["status"]) => void;
  newEmployees: NewEmployee[];

  requisitions: Requisition[];
  createRequisition: (req: Requisition) => Promise<void>;
  approveRequisition: (id: string) => void;
  rejectRequisition: (id: string) => void;

  interviews: Interview[];
  updateInterview: (id: string, patch: Partial<Interview>) => void;
  createInterview: (interview: Interview) => Promise<void>;

  workTrials: WorkTrial[];
  submitWorkTrialScores: (
    id: string,
    scores: { technical: number; patient: number; safety: number; culture: number }
  ) => void;

  referenceChecks: ReferenceCheck[];
  updateReferenceCheckOutcome: (id: string, outcome: ReferenceCheck["outcome"]) => void;

  offers: Offer[];
  acceptOffer: (id: string) => void;
  declineOffer: (id: string, reason?: string) => void;
  counterOffer: (id: string, amount: number) => void;
  withdrawOffer: (id: string, reason?: string) => void;
  reopenOffer: (id: string) => void;

  candidates: Candidate[];
  createCandidate: (candidate: Candidate) => Promise<void>;
  updateCandidateStage: (id: string, stage: Candidate["stage"]) => void;

  relievers: Reliever[];
  createReliever: (reliever: Reliever) => Promise<void>;

  locums: Locum[];
  createLocum: (locum: Locum) => Promise<void>;
};

const RecruitmentDataContext = React.createContext<RecruitmentDataContextValue | null>(null);

// Fires the persist call in the background; local state has already been
// updated optimistically by the caller, so a failure here just gets logged
// rather than rolled back (internal ops tool, not a payments flow).
function persist<T>(resource: string, id: string, patch: Partial<T>) {
  updateResource<T>(resource, id, patch).catch((err) => {
    console.error(`Failed to persist ${resource}/${id} to Airtable:`, err);
  });
}

// Mirrors the middleware's UNGATED_MUTATIONS exception (requisition intake
// stays open to every role) — every other mutator below is a no-op for a
// view-only user rather than silently firing a request that the server will
// 403 anyway.
function guardEdit(canEdit: boolean, action: string): boolean {
  if (!canEdit) {
    console.warn(`Blocked "${action}" — current role is view-only for recruitment data.`);
  }
  return canEdit;
}

export function RecruitmentDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const canEdit = canEditRecruitmentData(user?.role);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [openRoles, setOpenRoles] = React.useState<OpenRole[]>([]);
  const [newEmployees, setNewEmployees] = React.useState<NewEmployee[]>([]);
  const [requisitions, setRequisitions] = React.useState<Requisition[]>([]);
  const [interviews, setInterviews] = React.useState<Interview[]>([]);
  const [workTrials, setWorkTrials] = React.useState<WorkTrial[]>([]);
  const [referenceChecks, setReferenceChecks] = React.useState<ReferenceCheck[]>([]);
  const [offers, setOffers] = React.useState<Offer[]>([]);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [relievers, setRelievers] = React.useState<Reliever[]>([]);
  const [locums, setLocums] = React.useState<Locum[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      try {
        const [
          branchesRes,
          openRolesRes,
          newEmployeesRes,
          requisitionsRes,
          interviewsRes,
          workTrialsRes,
          referenceChecksRes,
          offersRes,
          candidatesRes,
          relieversRes,
          locumsRes,
        ] = await Promise.all([
          listResource<Branch>("branches"),
          listResource<OpenRole>("open-roles"),
          listResource<NewEmployee>("new-employees"),
          listResource<Requisition>("requisitions"),
          listResource<Interview>("interviews"),
          listResource<WorkTrial>("work-trials"),
          listResource<ReferenceCheck>("reference-checks"),
          listResource<Offer>("offers"),
          listResource<Candidate>("candidates"),
          listResource<Reliever>("relievers"),
          listResource<Locum>("locums"),
        ]);
        if (cancelled) return;
        setBranches(branchesRes);
        setOpenRoles(openRolesRes);
        setNewEmployees(newEmployeesRes);
        setRequisitions(requisitionsRes);
        setInterviews(interviewsRes);
        setWorkTrials(workTrialsRes);
        setReferenceChecks(referenceChecksRes);
        setOffers(offersRes);
        setCandidates(candidatesRes);
        setRelievers(relieversRes);
        setLocums(locumsRes);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data from Airtable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const createRequisition = React.useCallback(async (req: Requisition) => {
    const created = await createResource<Requisition>("requisitions", req);
    setRequisitions((prev) => [created, ...prev]);
  }, []);

  const convertToOpenRole = React.useCallback(
    async (req: Requisition) => {
      if (!guardEdit(canEdit, "convertToOpenRole")) return;
      const newRole = buildOpenRoleFromRequisition(req, branches);
      const created = await createResource<OpenRole>("open-roles", newRole);
      setOpenRoles((prev) => [created, ...prev]);
    },
    [branches, canEdit]
  );

  const updateOpenRoleStatus = React.useCallback(
    (id: string, status: OpenRole["status"]) => {
      if (!guardEdit(canEdit, "updateOpenRoleStatus")) return;
      const patch: Partial<OpenRole> = { status };
      if (status !== "Open") {
        patch.dateClosed = new Date().toISOString();
      }
      persist<OpenRole>("open-roles", id, patch);
      setOpenRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [canEdit]
  );

  const approveRequisition = React.useCallback(
    (id: string) => {
      if (!guardEdit(canEdit, "approveRequisition")) return;
      setRequisitions((prev) => {
        const req = prev.find((r) => r.id === id);
        if (!req) return prev;
        const nextIndex = req.currentApproverIndex + 1;
        const fullyApproved = nextIndex >= req.approverChain.length;
        const status = fullyApproved ? "Converted to Open Role" : "Pending Approval";
        persist<Requisition>("requisitions", id, { currentApproverIndex: nextIndex, status });
        if (fullyApproved) {
          convertToOpenRole(req).catch((err) =>
            console.error(`Failed to create Open Role from requisition ${req.reqId}:`, err)
          );
        }
        return prev.map((r) => (r.id === id ? { ...r, currentApproverIndex: nextIndex, status } : r));
      });
    },
    [convertToOpenRole, canEdit]
  );

  const rejectRequisition = React.useCallback(
    (id: string) => {
      if (!guardEdit(canEdit, "rejectRequisition")) return;
      persist<Requisition>("requisitions", id, { status: "Rejected" });
      setRequisitions((prev) =>
        prev.map((req) => (req.id === id ? { ...req, status: "Rejected" } : req))
      );
    },
    [canEdit]
  );

  const updateInterview = React.useCallback(
    (id: string, patch: Partial<Interview>) => {
      if (!guardEdit(canEdit, "updateInterview")) return;
      persist<Interview>("interviews", id, patch);
      setInterviews((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    [canEdit]
  );

  const createInterview = React.useCallback(
    async (interview: Interview) => {
      if (!guardEdit(canEdit, "createInterview")) return;
      const created = await createResource<Interview>("interviews", interview);
      setInterviews((prev) => [created, ...prev]);
    },
    [canEdit]
  );

  const submitWorkTrialScores = React.useCallback(
    (id: string, scores: { technical: number; patient: number; safety: number; culture: number }) => {
      if (!guardEdit(canEdit, "submitWorkTrialScores")) return;
      const total = computeWeightedTotal(scores);
      const patch: Partial<WorkTrial> = {
        scoreTechnical: scores.technical,
        scorePatient: scores.patient,
        scoreSafety: scores.safety,
        scoreCulture: scores.culture,
        total,
        passFail: total >= PASS_THRESHOLD ? "Pass" : "Fail",
        formSubmittedAt: new Date().toISOString(),
      };
      persist<WorkTrial>("work-trials", id, patch);
      setWorkTrials((prev) => prev.map((trial) => (trial.id === id ? { ...trial, ...patch } : trial)));
    },
    [canEdit]
  );

  const updateReferenceCheckOutcome = React.useCallback(
    (id: string, outcome: ReferenceCheck["outcome"]) => {
      if (!guardEdit(canEdit, "updateReferenceCheckOutcome")) return;
      persist<ReferenceCheck>("reference-checks", id, { outcome });
      setReferenceChecks((prev) => prev.map((c) => (c.id === id ? { ...c, outcome } : c)));
    },
    [canEdit]
  );

  const acceptOffer = React.useCallback(
    (id: string) => {
      if (!guardEdit(canEdit, "acceptOffer")) return;
      setOffers((prev) =>
        prev.map((offer) => {
          if (offer.id !== id) return offer;
          const finalAcceptedSalary = offer.counterOfferAmount ?? offer.offeredSalary;
          persist<Offer>("offers", id, { outcome: "Accepted", finalAcceptedSalary });
          return { ...offer, outcome: "Accepted", finalAcceptedSalary };
        })
      );
    },
    [canEdit]
  );

  const declineOffer = React.useCallback(
    (id: string, reason?: string) => {
      if (!guardEdit(canEdit, "declineOffer")) return;
      persist<Offer>("offers", id, { outcome: "Declined", dropReason: reason });
      setOffers((prev) =>
        prev.map((offer) => (offer.id === id ? { ...offer, outcome: "Declined", dropReason: reason } : offer))
      );
    },
    [canEdit]
  );

  const counterOffer = React.useCallback(
    (id: string, amount: number) => {
      if (!guardEdit(canEdit, "counterOffer")) return;
      persist<Offer>("offers", id, { outcome: "Negotiating", counterOfferAmount: amount });
      setOffers((prev) =>
        prev.map((offer) =>
          offer.id === id ? { ...offer, outcome: "Negotiating", counterOfferAmount: amount } : offer
        )
      );
    },
    [canEdit]
  );

  const withdrawOffer = React.useCallback(
    (id: string, reason?: string) => {
      if (!guardEdit(canEdit, "withdrawOffer")) return;
      persist<Offer>("offers", id, { outcome: "Withdrawn", dropReason: reason });
      setOffers((prev) =>
        prev.map((offer) => (offer.id === id ? { ...offer, outcome: "Withdrawn", dropReason: reason } : offer))
      );
    },
    [canEdit]
  );

  const reopenOffer = React.useCallback(
    (id: string) => {
      if (!guardEdit(canEdit, "reopenOffer")) return;
      persist<Offer>("offers", id, { outcome: "Pending", dropReason: undefined });
      setOffers((prev) =>
        prev.map((offer) => (offer.id === id ? { ...offer, outcome: "Pending", dropReason: undefined } : offer))
      );
    },
    [canEdit]
  );

  const createCandidate = React.useCallback(
    async (candidate: Candidate) => {
      if (!guardEdit(canEdit, "createCandidate")) return;
      const created = await createResource<Candidate>("candidates", candidate);
      setCandidates((prev) => [created, ...prev]);
    },
    [canEdit]
  );

  const updateCandidateStage = React.useCallback(
    (id: string, stage: Candidate["stage"]) => {
      if (!guardEdit(canEdit, "updateCandidateStage")) return;
      const patch: Partial<Candidate> = { stage, stageEnteredAt: new Date().toISOString() };
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      persist<Candidate>("candidates", id, patch);
    },
    [canEdit]
  );

  const createReliever = React.useCallback(
    async (reliever: Reliever) => {
      if (!guardEdit(canEdit, "createReliever")) return;
      const created = await createResource<Reliever>("relievers", reliever);
      setRelievers((prev) => [created, ...prev]);
    },
    [canEdit]
  );

  const createLocum = React.useCallback(
    async (locum: Locum) => {
      if (!guardEdit(canEdit, "createLocum")) return;
      const created = await createResource<Locum>("locums", locum);
      setLocums((prev) => [created, ...prev]);
    },
    [canEdit]
  );

  const value = React.useMemo<RecruitmentDataContextValue>(
    () => ({
      loading,
      error,
      canEdit,
      branches,
      openRoles,
      updateOpenRoleStatus,
      newEmployees,
      requisitions,
      createRequisition,
      approveRequisition,
      rejectRequisition,
      interviews,
      updateInterview,
      createInterview,
      workTrials,
      submitWorkTrialScores,
      referenceChecks,
      updateReferenceCheckOutcome,
      offers,
      acceptOffer,
      declineOffer,
      counterOffer,
      withdrawOffer,
      reopenOffer,
      candidates,
      createCandidate,
      updateCandidateStage,
      relievers,
      createReliever,
      locums,
      createLocum,
    }),
    [
      loading,
      error,
      canEdit,
      branches,
      openRoles,
      updateOpenRoleStatus,
      newEmployees,
      requisitions,
      createRequisition,
      approveRequisition,
      rejectRequisition,
      interviews,
      updateInterview,
      createInterview,
      workTrials,
      submitWorkTrialScores,
      referenceChecks,
      updateReferenceCheckOutcome,
      offers,
      acceptOffer,
      declineOffer,
      counterOffer,
      withdrawOffer,
      reopenOffer,
      candidates,
      createCandidate,
      updateCandidateStage,
      relievers,
      createReliever,
      locums,
      createLocum,
    ]
  );

  return <RecruitmentDataContext.Provider value={value}>{children}</RecruitmentDataContext.Provider>;
}

export function useRecruitmentData() {
  const ctx = React.useContext(RecruitmentDataContext);
  if (!ctx) throw new Error("useRecruitmentData must be used within a RecruitmentDataProvider");
  return ctx;
}
