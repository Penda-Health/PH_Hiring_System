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
import { listResource, createResource, updateResource, deleteResource } from "@/lib/airtable/browser-api";
import { useAuth } from "@/lib/auth/auth-context";
import { canEditRecruitmentData } from "@/lib/permissions";

type RecruitmentDataContextValue = {
  loading: boolean;
  /** True while the second phase of data (interviews, work trials, offers, etc.) is still arriving. Core data (roles, candidates, branches) is already available. */
  extendedLoading: boolean;
  error: string | null;
  /** Recruitment User/Manager only — Branch Manager and Contributor are view-only. UI affordance; the real check is server-side in middleware. */
  canEdit: boolean;
  /** Manually trigger a core data refresh (open-roles + candidates). Also called automatically every 60 s and on tab focus. */
  refresh: () => Promise<void>;

  branches: Branch[];
  openRoles: OpenRole[];
  createOpenRole: (role: OpenRole) => Promise<void>;
  updateOpenRoleStatus: (id: string, status: OpenRole["status"]) => void;
  updateOpenRole: (id: string, patch: Partial<OpenRole>) => void;
  newEmployees: NewEmployee[];

  requisitions: Requisition[];
  createRequisition: (req: Requisition) => Promise<void>;
  approveRequisition: (id: string) => void;
  rejectRequisition: (id: string) => void;

  interviews: Interview[];
  updateInterview: (id: string, patch: Partial<Interview>) => void;
  createInterview: (interview: Interview) => Promise<void>;

  workTrials: WorkTrial[];
  createWorkTrial: (trial: WorkTrial) => Promise<void>;
  updateWorkTrial: (id: string, patch: Partial<WorkTrial>) => void;
  deleteWorkTrial: (id: string) => void;
  submitWorkTrialScores: (
    id: string,
    scores: { technical: number; patient: number; culture: number }
  ) => void;

  referenceChecks: ReferenceCheck[];
  createReferenceCheck: (refCheck: ReferenceCheck) => Promise<void>;
  updateReferenceCheckOutcome: (id: string, outcome: ReferenceCheck["outcome"]) => void;

  offers: Offer[];
  createOffer: (offer: Offer) => Promise<void>;
  acceptOffer: (id: string) => void;
  declineOffer: (id: string, reason?: string) => void;
  counterOffer: (id: string, amount: number) => void;
  withdrawOffer: (id: string, reason?: string) => void;
  reopenOffer: (id: string) => void;

  candidates: Candidate[];
  createCandidate: (candidate: Candidate) => Promise<void>;
  updateCandidate: (id: string, patch: Partial<Candidate>) => void;
  updateCandidateStage: (id: string, stage: Candidate["stage"], roleId?: string) => void;
  deleteCandidate: (id: string) => void;

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
  const [extendedLoading, setExtendedLoading] = React.useState(true);
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
      // Phase 1 — core data: the minimum needed to render Pipeline, Candidates,
      // Roles Register, and the IPS Meeting Board. Completes first so the app
      // becomes interactive while phase 2 is still in flight.
      try {
        const [branchesRes, openRolesRes, candidatesRes, newEmployeesRes] = await Promise.all([
          listResource<Branch>("branches"),
          listResource<OpenRole>("open-roles"),
          listResource<Candidate>("candidates"),
          listResource<NewEmployee>("new-employees"),
        ]);
        if (cancelled) return;
        setBranches(branchesRes);
        setOpenRoles(openRolesRes);
        setCandidates(candidatesRes);
        setNewEmployees(newEmployeesRes);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load data from Airtable.");
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Phase 2 — extended data: page-specific resources loaded in the
      // background after the app is already interactive. Dashboard metrics
      // and dedicated pages update once these arrive.
      try {
        const [requisitionsRes, interviewsRes, workTrialsRes, referenceChecksRes, offersRes, relieversRes, locumsRes] =
          await Promise.all([
            listResource<Requisition>("requisitions"),
            listResource<Interview>("interviews"),
            listResource<WorkTrial>("work-trials"),
            listResource<ReferenceCheck>("reference-checks"),
            listResource<Offer>("offers"),
            listResource<Reliever>("relievers"),
            listResource<Locum>("locums"),
          ]);
        if (cancelled) return;
        setRequisitions(requisitionsRes);
        setInterviews(interviewsRes);
        setWorkTrials(workTrialsRes);
        setReferenceChecks(referenceChecksRes);
        setOffers(offersRes);
        setRelievers(relieversRes);
        setLocums(locumsRes);
      } catch (err) {
        if (!cancelled) console.error("Failed to load extended recruitment data:", err);
      } finally {
        if (!cancelled) setExtendedLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep data in sync with Airtable changes made outside the UI.
  // Refreshes on a 60s interval and whenever the browser tab regains focus.
  const refreshCoreData = React.useCallback(async () => {
    try {
      const [rolesRes, candidatesRes, interviewsRes, offersRes, workTrialsRes, refChecksRes] = await Promise.all([
        listResource<OpenRole>("open-roles"),
        listResource<Candidate>("candidates"),
        listResource<Interview>("interviews"),
        listResource<Offer>("offers"),
        listResource<WorkTrial>("work-trials"),
        listResource<ReferenceCheck>("reference-checks"),
      ]);
      setOpenRoles(rolesRes);
      setCandidates(candidatesRes);
      setInterviews(interviewsRes);
      setOffers(offersRes);
      setWorkTrials(workTrialsRes);
      setReferenceChecks(refChecksRes);
    } catch {
      // Silent — a background refresh failing shouldn't interrupt the user
    }
  }, []);

  React.useEffect(() => {
    const interval = setInterval(refreshCoreData, 60_000);
    window.addEventListener("focus", refreshCoreData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshCoreData);
    };
  }, [refreshCoreData]);

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

  const createOpenRole = React.useCallback(
    async (role: OpenRole) => {
      if (!guardEdit(canEdit, "createOpenRole")) return;
      const created = await createResource<OpenRole>("open-roles", role);
      setOpenRoles((prev) => [created, ...prev]);
    },
    [canEdit]
  );

  const updateOpenRoleStatus = React.useCallback(
    (id: string, status: OpenRole["status"]) => {
      if (!guardEdit(canEdit, "updateOpenRoleStatus")) return;
      const patch: Partial<OpenRole> = { status };
      if (status === "Open") {
        // Clear dateClosed so the Pipeline's month-range filter never hides a reopened role.
        (patch as Record<string, unknown>).dateClosed = null;
      } else {
        patch.dateClosed = new Date().toISOString();
      }
      persist<OpenRole>("open-roles", id, patch);
      setOpenRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, dateClosed: status === "Open" ? undefined : patch.dateClosed } : r)));
    },
    [canEdit]
  );

  const updateOpenRole = React.useCallback(
    (id: string, patch: Partial<OpenRole>) => {
      if (!guardEdit(canEdit, "updateOpenRole")) return;
      setOpenRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      persist<OpenRole>("open-roles", id, patch);
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

  const createWorkTrial = React.useCallback(
    async (trial: WorkTrial) => {
      if (!guardEdit(canEdit, "createWorkTrial")) return;
      const created = await createResource<WorkTrial>("work-trials", trial);
      setWorkTrials((prev) => [created, ...prev]);
    },
    [canEdit]
  );

  const updateWorkTrial = React.useCallback(
    (id: string, patch: Partial<WorkTrial>) => {
      if (!guardEdit(canEdit, "updateWorkTrial")) return;
      setWorkTrials((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      persist<WorkTrial>("work-trials", id, patch);
    },
    [canEdit]
  );

  const deleteWorkTrial = React.useCallback(
    (id: string) => {
      if (!guardEdit(canEdit, "deleteWorkTrial")) return;
      setWorkTrials((prev) => prev.filter((t) => t.id !== id));
      deleteResource("work-trials", id).catch((err) =>
        console.error("Failed to delete work trial from Airtable:", err)
      );
    },
    [canEdit]
  );

  const submitWorkTrialScores = React.useCallback(
    (id: string, scores: { technical: number; patient: number; culture: number }) => {
      if (!guardEdit(canEdit, "submitWorkTrialScores")) return;
      const total = computeWeightedTotal(scores);
      const patch: Partial<WorkTrial> = {
        scoreTechnical: scores.technical,
        scorePatient: scores.patient,
        scoreSafety: null,
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

  const createReferenceCheck = React.useCallback(
    async (refCheck: ReferenceCheck) => {
      if (!guardEdit(canEdit, "createReferenceCheck")) return;
      const created = await createResource<ReferenceCheck>("reference-checks", refCheck);
      setReferenceChecks((prev) => [created, ...prev]);
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

  const createOffer = React.useCallback(
    async (offer: Offer) => {
      if (!guardEdit(canEdit, "createOffer")) return;
      const created = await createResource<Offer>("offers", offer);
      setOffers((prev) => [created, ...prev]);
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
      // Use null so cleanFields passes it through and Airtable clears the field.
      persist<Offer>("offers", id, { outcome: "Pending", dropReason: null as unknown as string });
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

  const updateCandidate = React.useCallback(
    (id: string, patch: Partial<Candidate>) => {
      if (!guardEdit(canEdit, "updateCandidate")) return;
      // Drop empty strings — they fail schema validators (min/email) on the
      // server even in partial mode, silently killing the write for records
      // that have incomplete data (e.g. no email or unknown role).
      const persistPatch = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== "")
      ) as Partial<Candidate>;
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      persist<Candidate>("candidates", id, persistPatch);
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

  const updateCandidateStage = React.useCallback(
    (id: string, stage: Candidate["stage"], roleId?: string) => {
      if (!guardEdit(canEdit, "updateCandidateStage")) return;
      const now = new Date().toISOString();
      const patch: Partial<Candidate> = {
        stage,
        stageEnteredAt: now,
        ...(roleId ? { roleId } : {}),
      };
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      persist<Candidate>("candidates", id, patch);

      // When a candidate moves to Work Trial, auto-create the WorkTrial record
      // so it appears on the Work Trials page immediately. The recruiter can
      // update the branch/date/supervisor details from there.
      if (stage === "Work Trial") {
        const candidate = candidates.find((c) => c.id === id);
        if (candidate) {
          const linkedRole = openRoles.find((r) => r.id === candidate.roleId);
          const branch = branches.find((b) => b.name === linkedRole?.location);
          const now = new Date().toISOString();
          createWorkTrial({
            id: `wt-${Date.now()}`,
            wtId: "",
            candidateId: id,
            roleId: candidate.roleId || undefined,
            branchId: branch?.id ?? "",
            date: now.slice(0, 10),
            supervisor: branch?.branchManager ?? "",
            createdAt: now,
            arrivalMarked: null,
            scoreTechnical: null,
            scorePatient: null,
            scoreSafety: null,
            scoreCulture: null,
            total: null,
            passFail: "Pending",
            formSubmittedAt: null,
            submittedByRole: null,
            bmApprovedAt: null,
            reminder12hSent: false,
            escalation24hSent: false,
          } as WorkTrial).catch((err) => console.error("Failed to auto-create work trial:", err));
        }
        return;
      }

      if (stage !== "Hired") return;

      const candidate = candidates.find((c) => c.id === id);
      if (!candidate) return;

      // Auto-add to Locum or Reliever pool on hire.
      // Locums are NOT assigned branches at hire — they join the pool as available
      // across all branches until a permanent assignment is made.
      // Relievers DO get an initial branch from the role's location.
      if (candidate.employmentType === "Locum") {
        const linkedRole = openRoles.find((r) => r.id === candidate.roleId);
        createLocum({
          id: `loc-${Date.now()}`,
          name: candidate.name,
          speciality: linkedRole?.department ?? linkedRole?.title ?? "General",
          branchesCovered: [],
          dailyRate: 0,
          licenseNumber: "Pending",
          availability: "TBD",
        } as Locum).catch((err) => console.error("Failed to auto-create locum:", err));
      } else if (candidate.employmentType === "Reliever") {
        const linkedRole = openRoles.find((r) => r.id === candidate.roleId);
        createReliever({
          id: `rel-${Date.now()}`,
          name: candidate.name,
          role: linkedRole?.department ?? linkedRole?.title ?? "General",
          branchesCovered: linkedRole?.location ? [linkedRole.location] : [],
          availabilityDates: "TBD",
          status: "Active",
          phone: candidate.phone || "",
        } as Reliever).catch((err) => console.error("Failed to auto-create reliever:", err));
      }

      // Update linked role headcount
      if (candidate.roleId) {
        const role = openRoles.find((r) => r.id === candidate.roleId);
        if (role) {
          const newHcFilled = (role.hcFilled ?? 0) + 1;
          const newStatus: OpenRole["status"] =
            newHcFilled >= (role.hcApproved ?? 1) ? "Filled" : role.status;
          const rolePatch: Partial<OpenRole> = {
            hcFilled: newHcFilled,
            status: newStatus,
            ...(newStatus === "Filled" ? { dateClosed: new Date().toISOString() } : {}),
          };
          setOpenRoles((prev) =>
            prev.map((r) => (r.id === candidate.roleId ? { ...r, ...rolePatch } : r))
          );
          persist<OpenRole>("open-roles", role.id, rolePatch);
        }
      }
    },
    [canEdit, candidates, openRoles, branches, createWorkTrial, createLocum, createReliever]
  );

  const deleteCandidate = React.useCallback(
    (id: string) => {
      if (!guardEdit(canEdit, "deleteCandidate")) return;
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      deleteResource("candidates", id).catch((err) => {
        console.error(`Failed to delete candidate ${id} from Airtable:`, err);
      });
    },
    [canEdit]
  );

  const value = React.useMemo<RecruitmentDataContextValue>(
    () => ({
      loading,
      extendedLoading,
      error,
      canEdit,
      refresh: refreshCoreData,
      branches,
      openRoles,
      createOpenRole,
      updateOpenRoleStatus,
      updateOpenRole,
      newEmployees,
      requisitions,
      createRequisition,
      approveRequisition,
      rejectRequisition,
      interviews,
      updateInterview,
      createInterview,
      workTrials,
      createWorkTrial,
      updateWorkTrial,
      deleteWorkTrial,
      submitWorkTrialScores,
      referenceChecks,
      createReferenceCheck,
      updateReferenceCheckOutcome,
      offers,
      createOffer,
      acceptOffer,
      declineOffer,
      counterOffer,
      withdrawOffer,
      reopenOffer,
      candidates,
      createCandidate,
      updateCandidate,
      updateCandidateStage,
      deleteCandidate,
      relievers,
      createReliever,
      locums,
      createLocum,
    }),
    [
      loading,
      extendedLoading,
      error,
      canEdit,
      refreshCoreData,
      branches,
      openRoles,
      createOpenRole,
      updateOpenRoleStatus,
      updateOpenRole,
      newEmployees,
      requisitions,
      createRequisition,
      approveRequisition,
      rejectRequisition,
      interviews,
      updateInterview,
      createInterview,
      workTrials,
      createWorkTrial,
      updateWorkTrial,
      deleteWorkTrial,
      submitWorkTrialScores,
      referenceChecks,
      createReferenceCheck,
      updateReferenceCheckOutcome,
      offers,
      createOffer,
      acceptOffer,
      declineOffer,
      counterOffer,
      withdrawOffer,
      reopenOffer,
      candidates,
      createCandidate,
      updateCandidate,
      updateCandidateStage,
      deleteCandidate,
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
