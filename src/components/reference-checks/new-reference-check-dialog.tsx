"use client";

import * as React from "react";
import { ReferenceCheck, Candidate, RefereeStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { NewCandidateDialog } from "@/components/pipeline/new-candidate-dialog";

interface Props {
  onCreate: (refCheck: ReferenceCheck) => Promise<void>;
}

// Candidates who already have a settled outcome don't need to appear in the
// picker below — there's nothing left for a *new* reference check to do for
// them. "In progress" (Awaiting Verification/Responses, 1 Referee In) stays
// selectable in case a TA genuinely needs a second one going.
const SETTLED_STAGES: ReadonlySet<Candidate["stage"]> = new Set<Candidate["stage"]>([
  "Hired",
  "Rejected",
  "Withdrawn",
]);

/** Searchable candidate picker: type to filter by name, or — when nothing
 * matches — add the typed name as a brand-new candidate on the spot rather
 * than forcing the TA to leave this dialog and start over from Candidates. */
function CandidateCombobox({
  candidates,
  value,
  onChange,
  onRequestAddNew,
}: {
  candidates: Candidate[];
  value: string;
  onChange: (id: string) => void;
  onRequestAddNew: (typedName: string) => void;
}) {
  const selected = candidates.find((c) => c.id === value);
  const [query, setQuery] = React.useState(selected?.name ?? "");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Keep the input's text in sync when the selection changes from outside
  // this component (e.g. right after "add as new candidate" resolves).
  React.useEffect(() => {
    setQuery(selected?.name ?? "");
  }, [selected?.id, selected?.name]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const trimmedQuery = query.trim();
  const matches = React.useMemo(() => {
    if (!trimmedQuery) return candidates;
    const q = trimmedQuery.toLowerCase();
    return candidates.filter((c) => c.name.toLowerCase().includes(q));
  }, [candidates, trimmedQuery]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange(""); // editing the text again clears any prior pick until a new one is made
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search candidates…"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          {matches.length > 0 ? (
            matches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setQuery(c.name);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {c.name || "(no name)"}
              </button>
            ))
          ) : trimmedQuery ? (
            <div className="space-y-1 p-1">
              <p className="px-2 py-1 text-xs text-muted-foreground">No matching candidates.</p>
              <button
                type="button"
                onClick={() => {
                  onRequestAddNew(trimmedQuery);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left text-sm font-medium text-penda-blue hover:bg-accent"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Add &ldquo;{trimmedQuery}&rdquo; as a new candidate
              </button>
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">No eligible candidates.</p>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_REFEREE: RefereeStatus = {
  name: "", email: "", phone: "",
  emailSent: false, smsSent: false, responded: false,
};

export const MIN_REFEREES = 2;
export const MAX_REFEREES = 4;

export function RefereeFields({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: { name: string; email: string; phone: string };
  onChange: (v: { name: string; email: string; phone: string }) => void;
  onRemove?: () => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between px-1">
        <legend className="text-sm font-medium">{label}</legend>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Full name"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email</Label>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="referee@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Phone</Label>
        <Input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="+254…"
        />
      </div>
    </fieldset>
  );
}

export function NewReferenceCheckDialog({ onCreate }: Props) {
  const { user } = useAuth();
  const { candidates, referenceChecks, createCandidate } = useRecruitmentData();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [candidateId, setCandidateId] = React.useState("");
  const [referees, setReferees] = React.useState<{ name: string; email: string; phone: string }[]>([
    { name: "", email: "", phone: "" },
    { name: "", email: "", phone: "" },
  ]);
  const [addCandidateOpen, setAddCandidateOpen] = React.useState(false);
  const [newCandidateName, setNewCandidateName] = React.useState("");

  // Trim the picker to candidates a new reference check actually makes sense
  // for — see SETTLED_STAGES above.
  const eligibleCandidates = React.useMemo(() => {
    const completedCandidateIds = new Set(
      referenceChecks.filter((rc) => rc.status === "Ready for Offer").map((rc) => rc.candidateId)
    );
    return candidates.filter((c) => !SETTLED_STAGES.has(c.stage) && !completedCandidateIds.has(c.id));
  }, [candidates, referenceChecks]);

  function reset() {
    setCandidateId("");
    setNewCandidateName("");
    setReferees([
      { name: "", email: "", phone: "" },
      { name: "", email: "", phone: "" },
    ]);
    setSubmitError(null);
  }

  const allNamed = referees.every((r) => r.name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateId || !allNamed) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const now = new Date().toISOString();
      const refCheck: ReferenceCheck = {
        id: "",
        refId: "",
        candidateId,
        referees: referees.map((r) => ({ ...EMPTY_REFEREE, ...r })),
        outcome: "Pending",
        driveFolderUrl: null,
        createdAt: now,
        // TA-entered referees are self-verified by construction (a staff
        // member typed them in directly) — this path initiates immediately,
        // unlike the candidate self-serve path which waits on TA review.
        source: "TA Added",
        status: "Awaiting Responses",
        verifiedAt: now,
        verifiedBy: user?.name || user?.email || "",
        initiatedAt: now,
        reportPdfUrl: null,
        aiInsights: null,
      };
      await onCreate(refCheck);
      setOpen(false);
      reset();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-penda-blue hover:bg-penda-blue-dark text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          New Reference Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Reference Check</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Candidate</Label>
            <CandidateCombobox
              candidates={eligibleCandidates}
              value={candidateId}
              onChange={setCandidateId}
              onRequestAddNew={(typedName) => {
                setNewCandidateName(typedName);
                setAddCandidateOpen(true);
              }}
            />
          </div>
          {/* Controlled, trigger-less instance of the full "Add Candidate"
              form — reused as-is (same required fields, same duplicate
              detection) rather than a stripped-down quick-add that could
              write an incomplete candidate record. */}
          <NewCandidateDialog
            open={addCandidateOpen}
            onOpenChange={setAddCandidateOpen}
            initialName={newCandidateName}
            initialStage="Reference Check"
            hideTrigger
            onCreate={createCandidate}
            onCreated={(c) => setCandidateId(c.id)}
          />
          {referees.map((referee, i) => (
            <RefereeFields
              key={i}
              label={`Referee ${i + 1}`}
              value={referee}
              onChange={(v) => setReferees((prev) => prev.map((r, idx) => (idx === i ? v : r)))}
              onRemove={
                referees.length > MIN_REFEREES
                  ? () => setReferees((prev) => prev.filter((_, idx) => idx !== i))
                  : undefined
              }
            />
          ))}
          {referees.length < MAX_REFEREES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReferees((prev) => [...prev, { name: "", email: "", phone: "" }])}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add referee
            </Button>
          )}
          {submitError && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !candidateId || !allNamed}
              className="bg-penda-blue hover:bg-penda-blue-dark text-white"
            >
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
