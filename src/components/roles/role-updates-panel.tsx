"use client";

import * as React from "react";
import { RoleUpdate } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const WEEK_MS = 7 * 86_400_000;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Dated, append-only recruiter comments on a role — the weekly progress log
// that the IPS weekly summary, the roles report and Penny all read.
export function RoleUpdatesPanel({ roleId, canEdit }: { roleId: string; canEdit: boolean }) {
  const [updates, setUpdates] = React.useState<RoleUpdate[] | null>(null);
  const [draft, setDraft] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setUpdates(null);
    setDraft("");
    setError(null);
    fetch(`/api/role-updates?roleId=${encodeURIComponent(roleId)}`)
      .then((res) => (res.ok ? (res.json() as Promise<RoleUpdate[]>) : Promise.reject()))
      .then((data) => !cancelled && setUpdates(data))
      .catch(() => {
        if (cancelled) return;
        setUpdates([]);
        setError("Couldn't load updates.");
      });
    return () => {
      cancelled = true;
    };
  }, [roleId]);

  async function post() {
    const comment = draft.trim();
    if (!comment) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch("/api/role-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, comment }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as RoleUpdate;
      setUpdates((prev) => [created, ...(prev ?? [])]);
      setDraft("");
    } catch {
      setError("Couldn't post the update. Please try again.");
    } finally {
      setPosting(false);
    }
  }

  const latest = updates?.[0];
  const stale = updates !== null && (!latest || Date.now() - new Date(latest.createdAt).getTime() > WEEK_MS);

  return (
    <div className="space-y-2 rounded-md border border-border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Weekly updates</Label>
        {stale && <span className="text-xs text-amber-600">No update this week</span>}
      </div>

      {canEdit && (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Where is this role at? e.g. 3 shortlisted, work trials booked for Thursday…"
            className="min-h-[64px] resize-none text-sm"
            maxLength={2000}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={posting || !draft.trim()}
              onClick={post}
              className="bg-penda-blue hover:bg-penda-blue-dark"
            >
              {posting ? "Posting…" : "Post update"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {updates === null ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : updates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No updates yet.</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {updates.map((u) => (
            <li key={u.id} className="rounded-md bg-muted/40 px-2.5 py-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{u.authorName}</span> · {formatWhen(u.createdAt)}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm">{u.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
