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
import { listResource, createResource, updateResource } from "@/lib/airtable/browser-api";

type RecruitmentDataContextValue = {
  loading: boolean;
  error: string | null;

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

export function RecruitmentDataProvider({ children }: { children: React.ReactNode }) {
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
      const branch = branches.find((b) => b.id === req.branchId);
      const newRole: Partial<OpenRole> = {
        roleId: `OR-${req.reqId.replace(/^REQ-?/i, "")}`,
        title: req.roleTitle,
        segment: req.segment,
        department: req.department,
        location: branch ? `${branch.name} (${branch.city})` : "Unassigned",
        branchId: req.branchId,
        priority: req.urgency,
        status: "Open",
        hcApproved: req.headcount,
        hcFilled: 0,
        recruiter: req.submittedBy,
        hiringManager: req.submittedBy,
        datePosted: new Date().toISOString(),
        employmentType: req.employmentType,
        notes: req.context,
        requisitionId: req.id,
      };
      const created = await createResource<OpenRole>("open-roles", newRole);
      setOpenRoles((prev) => [created, ...prev]);
    },
    [branches]
  );

  const updateOpenRoleStatus = React.useCallback((id: string, status: OpenRole["status"]) => {
    const patch: Partial<OpenRole> = { status };
    if (status !== "Open") {
      patch.dateClosed = new Date().toISOString();
    }
    persist<OpenRole>("open-roles", id, patch);
    setOpenRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const approveRequisition = React.useCallback(
    (id: string) => {
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
    [convertToOpenRole]
  );

  const rejectRequisition = React.useCallback((id: string) => {
    persist<Requisition>("requisitions", id, { status: "Rejected" });
    setRequisitions((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: "Rejected" } : req))
    );
  }, []);

  const updateInterview = React.useCallback((id: string, patch: Partial<Interview>) => {
    persist<Interview>("interviews", id, patch);
    setInterviews((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const createInterview = React.useCallback(async (interview: Interview) => {
    const created = await createResource<Interview>("interviews", interview);
    setInterviews((prev) => [created, ...prev]);
  }, []);

  const submitWorkTrialScores = React.useCallback(
    (id: string, scores: { technical: number; patient: number; safety: number; culture: number }) => {
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
    []
  );

  const updateReferenceCheckOutcome = React.useCallback(
    (id: string, outcome: ReferenceCheck["outcome"]) => {
      persist<ReferenceCheck>("reference-checks", id, { outcome });
      setReferenceChecks((prev) => prev.map((c) => (c.id === id ? { ...c, outcome } : c)));
    },
    []
  );

  const acceptOffer = React.useCallback((id: string) => {
    setOffers((prev) =>
      prev.map((offer) => {
        if (offer.id !== id) return offer;
        const finalAcceptedSalary = offer.counterOfferAmount ?? offer.offeredSalary;
        persist<Offer>("offers", id, { outcome: "Accepted", finalAcceptedSalary });
        return { ...offer, outcome: "Accepted", finalAcceptedSalary };
      })
    );
  }, []);

  const declineOffer = React.useCallback((id: string, reason?: string) => {
    persist<Offer>("offers", id, { outcome: "Declined", dropReason: reason });
    setOffers((prev) =>
      prev.map((offer) => (offer.id === id ? { ...offer, outcome: "Declined", dropReason: reason } : offer))
    );
  }, []);

  const counterOffer = React.useCallback((id: string, amount: number) => {
    persist<Offer>("offers", id, { outcome: "Negotiating", counterOfferAmount: amount });
    setOffers((prev) =>
      prev.map((offer) =>
        offer.id === id ? { ...offer, outcome: "Negotiating", counterOfferAmount: amount } : offer
      )
    );
  }, []);

  const withdrawOffer = React.useCallback((id: string, reason?: string) => {
    persist<Offer>("offers", id, { outcome: "Withdrawn", dropReason: reason });
    setOffers((prev) =>
      prev.map((offer) => (offer.id === id ? { ...offer, outcome: "Withdrawn", dropReason: reason } : offer))
    );
  }, []);

  const reopenOffer = React.useCallback((id: string) => {
    persist<Offer>("offers", id, { outcome: "Pending", dropReason: undefined });
    setOffers((prev) =>
      prev.map((offer) => (offer.id === id ? { ...offer, outcome: "Pending", dropReason: undefined } : offer))
    );
  }, []);

  const createCandidate = React.useCallback(async (candidate: Candidate) => {
    const created = await createResource<Candidate>("candidates", candidate);
    setCandidates((prev) => [created, ...prev]);
  }, []);

  const createReliever = React.useCallback(async (reliever: Reliever) => {
    const created = await createResource<Reliever>("relievers", reliever);
    setRelievers((prev) => [created, ...prev]);
  }, []);

  const createLocum = React.useCallback(async (locum: Locum) => {
    const created = await createResource<Locum>("locums", locum);
    setLocums((prev) => [created, ...prev]);
  }, []);

  const value = React.useMemo<RecruitmentDataContextValue>(
    () => ({
      loading,
      error,
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
      relievers,
      createReliever,
      locums,
      createLocum,
    }),
    [
      loading,
      error,
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
      relievers,
      createReliever,
      locums,
      createLocum,
    ]
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Loading data from Airtable…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center px-6 text-center text-sm text-critical-fg">
        Failed to load data from Airtable: {error}
      </div>
    );
  }

  return <RecruitmentDataContext.Provider value={value}>{children}</RecruitmentDataContext.Provider>;
}

export function useRecruitmentData() {
  const ctx = React.useContext(RecruitmentDataContext);
  if (!ctx) throw new Error("useRecruitmentData must be used within a RecruitmentDataProvider");
  return ctx;
}
