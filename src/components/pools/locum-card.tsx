"use client";

import * as React from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Locum } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { canSeeSalary, maskSalary } from "@/lib/permissions";

export function LocumCard({
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
          <CardTitle className="text-base flex-1 min-w-0 truncate">{locum.name}</CardTitle>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline">{locum.availability}</Badge>
          {!editing && canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} className="p-1 rounded hover:bg-muted text-penda-blue" title="Save"><Check className="h-4 w-4" /></button>
              <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Cancel"><X className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2 text-sm">
        {editing ? (
          <div className="space-y-2">
            <Input className="h-7 text-xs" value={form.speciality} onChange={(e) => setForm((p) => ({ ...p, speciality: e.target.value }))} placeholder="Speciality" />
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-7 text-xs" value={form.licenseNumber} onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))} placeholder="License No." />
              <Input className="h-7 text-xs" type="number" value={form.dailyRate} onChange={(e) => setForm((p) => ({ ...p, dailyRate: e.target.value }))} placeholder="Daily Rate" />
            </div>
            <Input className="h-7 text-xs" value={form.availability} onChange={(e) => setForm((p) => ({ ...p, availability: e.target.value }))} placeholder="Availability" />
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">{locum.speciality}</p>
            <div className="flex flex-wrap gap-1">
              {locum.branchesCovered.map((branch) => (
                <Badge key={branch} variant="outline">{branch}</Badge>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>License: {locum.licenseNumber}</span>
              <span className="font-medium text-foreground">
                {maskSalary(locum.dailyRate, user?.role)}{showSalary ? "/day" : ""}
              </span>
            </div>
            {locum.lastDeployed && (
              <p className="text-xs text-muted-foreground">Last deployed: {locum.lastDeployed}</p>
            )}
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
