"use client";

import * as React from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Locum } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { canSeeSalary, maskSalary } from "@/lib/permissions";

export function LocumListItem({
  locum,
  canEdit,
  canDelete,
  onUpdate,
  onDelete,
}: {
  locum: Locum;
  canEdit?: boolean;
  canDelete?: boolean;
  onUpdate?: (patch: Partial<Locum>) => void;
  onDelete?: () => void;
}) {
  const { user } = useAuth();
  const showSalary = canSeeSalary(user?.role);
  const [editing, setEditing] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [form, setForm] = React.useState({
    name: locum.name,
    speciality: locum.speciality,
    licenseNumber: locum.licenseNumber,
    dailyRate: String(locum.dailyRate),
    availability: locum.availability,
  });

  React.useEffect(() => {
    setForm({
      name: locum.name,
      speciality: locum.speciality,
      licenseNumber: locum.licenseNumber,
      dailyRate: String(locum.dailyRate),
      availability: locum.availability,
    });
  }, [locum.id]);

  function handleSave() {
    onUpdate?.({
      name: form.name.trim() || locum.name,
      speciality: form.speciality.trim() || locum.speciality,
      licenseNumber: form.licenseNumber.trim() || locum.licenseNumber,
      dailyRate: Number(form.dailyRate) || locum.dailyRate,
      availability: form.availability.trim() || locum.availability,
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="p-3 flex items-center gap-3 flex-wrap">
          <Input className="h-7 text-sm w-36 shrink-0" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus placeholder="Name" />
          <Input className="h-7 text-xs w-32 shrink-0" value={form.speciality} onChange={(e) => setForm((p) => ({ ...p, speciality: e.target.value }))} placeholder="Speciality" />
          <Input className="h-7 text-xs w-28 shrink-0" value={form.licenseNumber} onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))} placeholder="License No." />
          <Input className="h-7 text-xs w-24 shrink-0" type="number" value={form.dailyRate} onChange={(e) => setForm((p) => ({ ...p, dailyRate: e.target.value }))} placeholder="Rate" />
          <Input className="h-7 text-xs w-28 shrink-0" value={form.availability} onChange={(e) => setForm((p) => ({ ...p, availability: e.target.value }))} placeholder="Availability" />
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
        <p className="text-sm font-semibold w-40 shrink-0 truncate">{locum.name}</p>
        <p className="text-xs text-muted-foreground w-32 shrink-0 truncate">{locum.speciality}</p>
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {locum.branchesCovered.map((branch) => (
            <Badge key={branch} variant="outline">{branch}</Badge>
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">License: {locum.licenseNumber}</span>
        <span className="text-xs font-medium w-28 shrink-0 text-right">
          {maskSalary(locum.dailyRate, user?.role)}{showSalary ? "/day" : ""}
        </span>
        <Badge variant="outline" className="shrink-0">{locum.availability}</Badge>
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
