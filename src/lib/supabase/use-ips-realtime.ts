"use client";

import * as React from "react";
import type { RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./client";
import { IpsAllocation, IpsMeetingNote, rowToAllocation, rowToNote } from "./ips-meetings";

export type IpsRealtimeStatus = "connecting" | "connected" | "error";

interface UseIpsRealtimeArgs {
  meetingId: string | null;
  onAllocationChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>, allocation: IpsAllocation | null) => void;
  onNoteChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>, note: IpsMeetingNote | null) => void;
  /** Called when the tab regains visibility, in case a websocket drop was missed while backgrounded — callers should refetch state here. */
  onResync?: () => void;
}

// First feature in this app to use Supabase Realtime. The view RLS policy
// on these tables doesn't vary per-row (any profile sees any row), so
// there's no risk of a change event being silently dropped for a user who
// should see it — re-check this reasoning if a future table here ever gets
// row-level-varying visibility (e.g. branch-scoped).
export function useIpsRealtime({ meetingId, onAllocationChange, onNoteChange, onResync }: UseIpsRealtimeArgs): IpsRealtimeStatus {
  const [status, setStatus] = React.useState<IpsRealtimeStatus>("connecting");
  const clientRef = React.useRef<SupabaseClient | null>(null);
  if (clientRef.current === null) clientRef.current = createSupabaseBrowserClient();

  const onAllocationChangeRef = React.useRef(onAllocationChange);
  onAllocationChangeRef.current = onAllocationChange;
  const onNoteChangeRef = React.useRef(onNoteChange);
  onNoteChangeRef.current = onNoteChange;
  const onResyncRef = React.useRef(onResync);
  onResyncRef.current = onResync;

  React.useEffect(() => {
    const supabase = clientRef.current;
    if (!supabase || !meetingId) return;

    setStatus("connecting");
    const channel = supabase
      .channel(`ips-meeting-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ips_allocations", filter: `meeting_id=eq.${meetingId}` },
        (payload) => {
          const row = payload.eventType === "DELETE" ? payload.old : payload.new;
          onAllocationChangeRef.current(
            payload,
            payload.eventType === "DELETE" ? null : rowToAllocation(row as Parameters<typeof rowToAllocation>[0])
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ips_meeting_notes", filter: `meeting_id=eq.${meetingId}` },
        (payload) => {
          const row = payload.eventType === "DELETE" ? payload.old : payload.new;
          onNoteChangeRef.current(
            payload,
            payload.eventType === "DELETE" ? null : rowToNote(row as Parameters<typeof rowToNote>[0])
          );
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") setStatus("connected");
        else if (subscribeStatus === "CHANNEL_ERROR" || subscribeStatus === "TIMED_OUT" || subscribeStatus === "CLOSED") {
          setStatus("error");
        }
      });

    // Defensive resync trigger: a missed websocket event while the tab was
    // backgrounded wouldn't otherwise be noticed, since there's no existing
    // reconnect-handling precedent in this codebase to lean on yet.
    const onVisible = () => {
      if (document.visibilityState === "visible") onResyncRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  return status;
}
