"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  createNote,
  fetchAllocations,
  fetchBoardEditors,
  fetchLatestMeeting,
  fetchNotes,
  IpsAllocation,
  IpsMeeting,
  IpsMeetingNote,
  resolveNote,
  seedAllocationsForMeeting,
  upsertAllocationCandidate,
} from "@/lib/supabase/ips-meetings";
import { useIpsRealtime } from "@/lib/supabase/use-ips-realtime";
import { deriveIpsSlots, IPS_ROLE_GROUPS } from "@/lib/ips-role-groups";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SummaryBar } from "@/components/ips-meeting/summary-bar";
import { AllocationSection } from "@/components/ips-meeting/role-group-section";
import { MeetingNotesPanel } from "@/components/ips-meeting/meeting-notes-panel";
import { ShareSummaryButton, IpsViewMode } from "@/components/ips-meeting/share-summary-button";
import { BoardEditorsDialog } from "@/components/ips-meeting/board-editors-dialog";
import { NewMeetingButton } from "@/components/ips-meeting/new-meeting-button";

export default function IpsMeetingPage() {
  const { user } = useAuth();
  const { branches, openRoles, candidates } = useRecruitmentData();

  const [meeting, setMeeting] = React.useState<IpsMeeting | null>(null);
  const [allocations, setAllocations] = React.useState<IpsAllocation[]>([]);
  const [notes, setNotes] = React.useState<IpsMeetingNote[]>([]);
  const [editorIds, setEditorIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<IpsViewMode>("role");

  const roleById = React.useMemo(() => new Map(openRoles.map((r) => [r.id, r])), [openRoles]);
  const branchById = React.useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const canEdit = !!user && (user.role === "recruitment_manager" || editorIds.has(user.id));

  const loadAll = React.useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const latest = await fetchLatestMeeting(supabase);
    setMeeting(latest);
    if (latest) {
      const [allocationRows, noteRows] = await Promise.all([fetchAllocations(supabase, latest.id), fetchNotes(supabase, latest.id)]);
      setAllocations(allocationRows);
      setNotes(noteRows);
    } else {
      setAllocations([]);
      setNotes([]);
    }
    const editors = await fetchBoardEditors(supabase);
    setEditorIds(new Set(editors.map((e) => e.profileId)));
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Seed any open IPS role from Airtable that doesn't yet have a slot in the current meeting.
  const { slots, unmappedCount } = React.useMemo(() => deriveIpsSlots(openRoles), [openRoles]);
  React.useEffect(() => {
    if (!meeting || !canEdit) return;
    const existingRoleIds = new Set(allocations.map((a) => a.openRoleId));
    const missing = slots.filter((s) => !existingRoleIds.has(s.openRoleId));
    if (missing.length === 0) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    seedAllocationsForMeeting(supabase, meeting.id, missing).then((result) => {
      if (result.ok) loadAll();
    });
  }, [meeting, slots, allocations, canEdit, loadAll]);

  const handleAllocationChange = React.useCallback((_payload: unknown, allocation: IpsAllocation | null) => {
    setAllocations((prev) => {
      if (!allocation) return prev;
      const idx = prev.findIndex((a) => a.id === allocation.id);
      if (idx === -1) return [...prev, allocation];
      const next = [...prev];
      next[idx] = allocation;
      return next;
    });
  }, []);

  const handleNoteChange = React.useCallback((_payload: unknown, note: IpsMeetingNote | null) => {
    setNotes((prev) => {
      if (!note) return prev;
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx === -1) return [...prev, note];
      const next = [...prev];
      next[idx] = note;
      return next;
    });
  }, []);

  const realtimeStatus = useIpsRealtime({
    meetingId: meeting?.id ?? null,
    onAllocationChange: handleAllocationChange,
    onNoteChange: handleNoteChange,
    onResync: loadAll,
  });

  async function handleCandidateChange(allocationId: string, candidateId: string | null) {
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setAllocations((prev) => prev.map((a) => (a.id === allocationId ? { ...a, candidateId } : a)));
    await upsertAllocationCandidate(supabase, allocationId, { candidateId }, user.id);
  }

  async function handleNoteFieldChange(allocationId: string, note: string) {
    if (!user) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setAllocations((prev) => prev.map((a) => (a.id === allocationId ? { ...a, note } : a)));
    await upsertAllocationCandidate(supabase, allocationId, { note }, user.id);
  }

  async function handleAddNote(noteType: IpsMeetingNote["noteType"], body: string) {
    if (!user || !meeting) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const result = await createNote(supabase, meeting.id, noteType, body, user.id);
    if (result.ok) loadAll();
  }

  async function handleResolveNote(noteId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, resolved: true } : n)));
    await resolveNote(supabase, noteId);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!meeting) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">IPS Meeting Board</h1>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">No IPS meeting has been created yet.</p>
            {canEdit ? (
              <NewMeetingButton onCreated={loadAll} />
            ) : (
              <p className="text-xs text-muted-foreground">Ask a Recruitment Manager to start the first meeting.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">IPS Meeting Board</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(`${meeting.meetingDate}T00:00:00`).toLocaleDateString()}
            {realtimeStatus === "error" && " · reconnecting…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ShareSummaryButton meeting={meeting} allocations={allocations} notes={notes} view={view} roleById={roleById} branchById={branchById} />
          {user?.role === "recruitment_manager" && <BoardEditorsDialog currentUserId={user.id} />}
          {canEdit && <NewMeetingButton onCreated={loadAll} />}
        </div>
      </div>

      <SummaryBar allocations={allocations} unmappedCount={unmappedCount} />

      <Tabs value={view} onValueChange={(v) => setView(v as IpsViewMode)}>
        <TabsList>
          <TabsTrigger value="role">By role</TabsTrigger>
          <TabsTrigger value="branch">By branch</TabsTrigger>
          <TabsTrigger value="priority">Priority only</TabsTrigger>
        </TabsList>

        <TabsContent value="role" className="space-y-6 pt-4">
          {IPS_ROLE_GROUPS.map((group) => (
            <AllocationSection
              key={group}
              title={group}
              allocations={allocations.filter((a) => a.roleGroup === group)}
              roleById={roleById}
              branchById={branchById}
              candidates={candidates}
              openRoles={openRoles}
              canEdit={canEdit}
              onCandidateChange={handleCandidateChange}
              onNoteChange={handleNoteFieldChange}
            />
          ))}
        </TabsContent>

        <TabsContent value="branch" className="space-y-6 pt-4">
          {branches.map((branch) => (
            <AllocationSection
              key={branch.id}
              title={branch.name}
              allocations={allocations.filter((a) => a.branchId === branch.id)}
              roleById={roleById}
              branchById={branchById}
              candidates={candidates}
              openRoles={openRoles}
              canEdit={canEdit}
              onCandidateChange={handleCandidateChange}
              onNoteChange={handleNoteFieldChange}
            />
          ))}
        </TabsContent>

        <TabsContent value="priority" className="space-y-6 pt-4">
          <AllocationSection
            title="Critical & High priority, unfilled"
            allocations={allocations.filter((a) => !a.candidateId && (a.priority === "Critical" || a.priority === "High"))}
            roleById={roleById}
            branchById={branchById}
            candidates={candidates}
            openRoles={openRoles}
            canEdit={canEdit}
            onCandidateChange={handleCandidateChange}
            onNoteChange={handleNoteFieldChange}
          />
        </TabsContent>
      </Tabs>

      <MeetingNotesPanel notes={notes} canEdit={canEdit} onAddNote={handleAddNote} onResolveNote={handleResolveNote} />
    </div>
  );
}
