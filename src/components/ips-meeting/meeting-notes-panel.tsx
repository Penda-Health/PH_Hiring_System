"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IpsMeetingNote, IpsNoteType } from "@/lib/supabase/ips-meetings";

const NOTE_TYPES: IpsNoteType[] = ["General", "Action", "Risk", "Decision"];

const NOTE_BADGE_VARIANT: Record<IpsNoteType, "secondary" | "high" | "critical" | "so"> = {
  General: "secondary",
  Action: "high",
  Risk: "critical",
  Decision: "so",
};

export function MeetingNotesPanel({
  notes,
  canEdit,
  onAddNote,
  onResolveNote,
  onDeleteNote,
}: {
  notes: IpsMeetingNote[];
  canEdit: boolean;
  onAddNote: (noteType: IpsNoteType, body: string) => void;
  onResolveNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
}) {
  const [noteType, setNoteType] = React.useState<IpsNoteType>("General");
  const [body, setBody] = React.useState("");
  const notesById = new Map(notes.map((n) => [n.id, n]));

  function handleAdd() {
    if (!body.trim()) return;
    onAddNote(noteType, body.trim());
    setBody("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => {
              const carriedFrom = note.carriedFromNoteId ? notesById.get(note.carriedFromNoteId) : undefined;
              return (
                <li key={note.id} className="flex items-start gap-2 border-b pb-2 last:border-b-0">
                  <Badge variant={NOTE_BADGE_VARIANT[note.noteType]} className="shrink-0 mt-0.5">
                    {note.noteType}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className={note.resolved ? "text-sm text-muted-foreground line-through" : "text-sm"}>{note.body}</p>
                    {note.carriedFromNoteId && (
                      <p className="text-xs text-muted-foreground">
                        Carried from {carriedFrom ? new Date(carriedFrom.createdAt).toLocaleDateString() : "a previous meeting"}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!note.resolved && (note.noteType === "Action" || note.noteType === "Risk") && (
                        <Button size="sm" variant="outline" onClick={() => onResolveNote(note.id)}>
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm("Delete this note? This can't be undone.")) onDeleteNote(note.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit && (
          <div className="flex items-start gap-2 pt-2">
            <Select value={noteType} onValueChange={(v) => setNoteType(v as IpsNoteType)}>
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Add a note…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="flex-1 min-h-10"
            />
            <Button size="sm" onClick={handleAdd} className="shrink-0 bg-penda-teal hover:bg-penda-teal-dark">
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
