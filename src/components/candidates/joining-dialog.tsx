"use client";

// "Update joining" for a hired candidate: confirm they started, or record
// that they signed but didn't join (with why), optionally giving the seat
// back to their role. See updateCandidateJoining in recruitment-context.
import * as React from "react";
import { Candidate, JoinStatus, OpenRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const OPTIONS: { value: JoinStatus; label: string; hint: string }[] = [
  { value: "Pending", label: "Not yet", hint: "Still expected to join" },
  { value: "Joined", label: "Joined", hint: "They reported and started" },
  { value: "Did Not Join", label: "Did not join", hint: "Signed, but dropped off" },
];

export function JoiningDialog({
  candidate,
  openRoles,
  onOpenChange,
  onSave,
}: {
  candidate: Candidate | null;
  openRoles: OpenRole[];
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    patch: Pick<Candidate, "joined" | "expectedJoiningDate" | "joinedOn" | "dropOffReason">,
    opts?: { reopenSeat?: boolean }
  ) => void;
}) {
  const [status, setStatus] = React.useState<JoinStatus>("Pending");
  const [expected, setExpected] = React.useState("");
  const [joinedOn, setJoinedOn] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [reopenSeat, setReopenSeat] = React.useState(true);

  React.useEffect(() => {
    if (!candidate) return;
    setStatus(candidate.joined ?? "Pending");
    setExpected(candidate.expectedJoiningDate ?? "");
    setJoinedOn(candidate.joinedOn ?? candidate.expectedJoiningDate ?? "");
    setReason(candidate.dropOffReason ?? "");
    setReopenSeat(true);
  }, [candidate]);

  const role = openRoles.find((r) => r.id === candidate?.roleId);
  // The seat question only applies the first time they're marked dropped.
  const askReopen = status === "Did Not Join" && candidate?.joined !== "Did Not Join" && !!role;
  const valid =
    status === "Joined" ? !!joinedOn : status === "Did Not Join" ? reason.trim().length > 0 : !!expected;

  function save() {
    if (!candidate || !valid) return;
    onSave(
      candidate.id,
      {
        joined: status,
        expectedJoiningDate: expected || null,
        joinedOn: status === "Joined" ? joinedOn : null,
        dropOffReason: status === "Did Not Join" ? reason.trim() : null,
      },
      { reopenSeat: askReopen && reopenSeat }
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {candidate && (
          <>
            <DialogHeader>
              <DialogTitle>Joining · {candidate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="joining-expected">Expected joining date</Label>
                <Input id="joining-expected" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Did they join?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setStatus(o.value)}
                      className={`rounded-md border p-2 text-left text-sm transition-colors ${
                        status === o.value ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
                      }`}
                    >
                      <p className="font-medium">{o.label}</p>
                      <p className="text-xs text-muted-foreground">{o.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              {status === "Joined" && (
                <div className="space-y-1.5">
                  <Label htmlFor="joining-on">Date they started</Label>
                  <Input id="joining-on" type="date" value={joinedOn} onChange={(e) => setJoinedOn(e.target.value)} />
                </div>
              )}

              {status === "Did Not Join" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="joining-reason">Why didn&apos;t they join? (required)</Label>
                    <Textarea
                      id="joining-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="e.g. Accepted a counter-offer, relocated, no-show on day one"
                    />
                  </div>
                  {askReopen && role && (
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={reopenSeat}
                        onChange={(e) => setReopenSeat(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-input"
                      />
                      <span>
                        Reopen the seat on {role.roleId} ({role.title}, {role.location}): headcount filled{" "}
                        {role.hcFilled} → {Math.max(0, role.hcFilled - 1)}
                        {role.status === "Filled" ? ", and the role goes back to Open" : ""}.
                      </span>
                    </label>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={!valid} className="bg-penda-blue hover:bg-penda-blue-dark">
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
