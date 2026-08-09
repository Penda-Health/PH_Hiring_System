"use client";

import * as React from "react";
import { Phone, Pencil, Trash2, Check, X } from "lucide-react";
import { Reliever } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RELIEVER_CADRES } from "@/lib/mock-data/clusters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_STYLES: Record<Reliever["status"], string> = {
  Active: "bg-penda-blue-light text-penda-blue-dark border-transparent",
  Inactive: "bg-muted text-muted-foreground border-transparent",
};

export function RelieverListItem({
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
    startDate: reliever.startDate ?? "",
  });

  React.useEffect(() => {
    setForm({ name: reliever.name, role: reliever.role, phone: reliever.phone, startDate: reliever.startDate ?? "" });
  }, [reliever.id]);

  function handleSave() {
    onUpdate?.({
      name: form.name.trim() || reliever.name,
      role: form.role,
      phone: form.phone.trim() || reliever.phone,
      startDate: form.startDate || undefined,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <Input className="h-7 text-sm w-36 shrink-0" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus />
          <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
            <SelectTrigger className="h-7 text-xs w-36 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>{RELIEVER_CADRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="h-7 text-xs w-28 shrink-0" type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
          <Input className="h-7 text-xs w-32 shrink-0" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <div className="flex gap-1 ml-auto">
            <button onClick={handleSave} className="p-1 rounded hover:bg-muted text-penda-blue" title="Save"><Check className="h-4 w-4" /></button>
            <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Cancel"><X className="h-4 w-4" /></button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-4">
        <p className="text-sm font-semibold w-40 shrink-0 truncate">{reliever.name}</p>
        <p className="text-xs text-muted-foreground w-36 shrink-0 truncate">{reliever.role}</p>
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {reliever.branchesCovered.map((branch) => (
            <Badge key={branch} variant="outline">{branch}</Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground w-32 shrink-0 truncate">
          {reliever.startDate ? `From ${reliever.startDate}` : "—"}
        </p>
        <Badge className={STATUS_STYLES[reliever.status]}>{reliever.status}</Badge>
        <a href={`tel:${reliever.phone}`} className="flex items-center gap-1.5 text-xs text-penda-blue hover:underline shrink-0">
          <Phone className="h-3.5 w-3.5" /> {reliever.phone}
        </a>
        {canEdit && (
          <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={onDelete}>Remove</Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive shrink-0" title="Remove">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </CardContent>
    </Card>
  );
}
