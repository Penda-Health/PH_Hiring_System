"use client";

import * as React from "react";
import { Mail, Phone, Pencil, Trash2, Check, X } from "lucide-react";
import { Reliever } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RELIEVER_CADRES } from "@/lib/mock-data/clusters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_STYLES: Record<Reliever["status"], string> = {
  Active: "bg-penda-blue-light text-penda-blue-dark border-transparent",
  Inactive: "bg-muted text-muted-foreground border-transparent",
};

export function RelieverCard({
  reliever,
  canEdit,
  canDelete,
  onUpdate,
  onDelete,
}: {
  reliever: Reliever;
  canEdit?: boolean;
  canDelete?: boolean;
  onUpdate?: (patch: Partial<Reliever>) => void;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [form, setForm] = React.useState({
    name: reliever.name,
    role: reliever.role,
    phone: reliever.phone,
    email: reliever.email ?? "",
    startDate: reliever.startDate ?? "",
  });

  // Sync form if reliever prop changes
  React.useEffect(() => {
    setForm({
      name: reliever.name,
      role: reliever.role,
      phone: reliever.phone,
      email: reliever.email ?? "",
      startDate: reliever.startDate ?? "",
    });
  }, [reliever.id]);

  function handleSave() {
    onUpdate?.({
      name: form.name.trim() || reliever.name,
      role: form.role,
      phone: form.phone.trim() || reliever.phone,
      email: form.email.trim() || undefined,
      startDate: form.startDate || undefined,
    });
    setEditing(false);
  }

  function handleCancel() {
    setForm({ name: reliever.name, role: reliever.role, phone: reliever.phone, email: reliever.email ?? "", startDate: reliever.startDate ?? "" });
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
        {editing ? (
          <Input
            className="text-base font-semibold h-7 px-1.5 py-0"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            autoFocus
          />
        ) : (
          <CardTitle className="text-base flex-1 min-w-0 truncate">{reliever.name}</CardTitle>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <Badge className={STATUS_STYLES[reliever.status]}>{reliever.status}</Badge>
          {!editing && canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="ml-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} className="p-1 rounded hover:bg-muted text-penda-blue" title="Save"><Check className="h-4 w-4" /></button>
              <button onClick={handleCancel} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Cancel"><X className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {editing ? (
          <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{RELIEVER_CADRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <p className="text-muted-foreground">{reliever.role}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {reliever.branchesCovered.map((branch) => (
            <Badge key={branch} variant="outline">{branch}</Badge>
          ))}
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-2">
            <Input className="h-7 text-xs" type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
            <Input className="h-7 text-xs" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
            <Input className="h-7 text-xs col-span-2" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          </div>
        ) : (
          <>
            {reliever.startDate && (
              <p className="text-xs text-muted-foreground">Start date: {reliever.startDate}</p>
            )}
            <div className="flex flex-col gap-1">
              <a href={`tel:${reliever.phone}`} className="flex items-center gap-1.5 text-xs text-penda-blue hover:underline">
                <Phone className="h-3.5 w-3.5" /> {reliever.phone}
              </a>
              {reliever.email && (
                <a href={`mailto:${reliever.email}`} className="flex items-center gap-1.5 text-xs text-penda-blue hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {reliever.email}
                </a>
              )}
            </div>
            {reliever.notes && <p className="text-xs text-muted-foreground italic">{reliever.notes}</p>}
          </>
        )}

        {canDelete && !editing && (
          confirmDelete ? (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-destructive">Remove from pool?</span>
              <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={onDelete}>Yes, remove</Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors pt-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          )
        )}
      </CardContent>
    </Card>
  );
}
