"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createMeeting } from "@/lib/supabase/ips-meetings";

export function NewMeetingButton({ onCreated }: { onCreated: (meetingId: string) => void }) {
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleClick() {
    setCreating(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase isn't configured.");
      setCreating(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const result = await createMeeting(supabase, today);
    if (result.ok && result.meetingId) {
      onCreated(result.meetingId);
    } else {
      setError(result.error ?? "Failed to create meeting");
    }
    setCreating(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={creating} onClick={handleClick} className="bg-penda-teal hover:bg-penda-teal-dark">
        <Plus className="h-4 w-4 mr-1.5" />
        {creating ? "Creating…" : "New meeting"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
