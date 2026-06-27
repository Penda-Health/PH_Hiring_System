"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { listAllProfiles } from "@/lib/supabase/profiles";
import {
  addBoardEditor,
  fetchBoardEditors,
  IpsBoardEditor,
  removeBoardEditor,
} from "@/lib/supabase/ips-meetings";
import { User } from "@/types";

export function BoardEditorsDialog({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = React.useState(false);
  const [editors, setEditors] = React.useState<IpsBoardEditor[]>([]);
  const [profiles, setProfiles] = React.useState<User[]>([]);
  const [selected, setSelected] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoading(true);
    const [editorRows, allProfiles] = await Promise.all([fetchBoardEditors(supabase), listAllProfiles(supabase)]);
    setEditors(editorRows);
    setProfiles(allProfiles);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleAdd() {
    if (!selected) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const result = await addBoardEditor(supabase, selected, currentUserId);
    if (result.ok) {
      setSelected("");
      load();
    }
  }

  async function handleRemove(profileId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const result = await removeBoardEditor(supabase, profileId);
    if (result.ok) load();
  }

  const editorIds = new Set(editors.map((e) => e.profileId));
  const candidates = profiles.filter((p) => !editorIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-1.5" />
          Manage editors
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>IPS board editors</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Anyone added here can edit the IPS Meeting Board, regardless of their system role.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-2">
            {editors.length === 0 && <p className="text-sm text-muted-foreground">No additional editors yet.</p>}
            {editors.map((e) => (
              <li key={e.profileId} className="flex items-center justify-between gap-2 border-b pb-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{e.displayName ?? e.email}</p>
                  <p className="text-xs text-muted-foreground leading-tight truncate">{e.email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleRemove(e.profileId)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add someone…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!selected} onClick={handleAdd} className="bg-penda-teal hover:bg-penda-teal-dark">
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
