"use client";

import { Candidate, OpenRole } from "@/types";
import { RoleCard } from "./role-card";

export function RoleGrid({
  roles,
  candidates,
  selectedRoleId,
  onSelectRole,
}: {
  roles: OpenRole[];
  candidates: Candidate[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          count={candidates.filter((c) => c.roleId === role.id).length}
          selected={role.id === selectedRoleId}
          onSelect={() => onSelectRole(role.id)}
        />
      ))}
      {roles.length === 0 && (
        <p className="text-sm text-muted-foreground col-span-full text-center py-8">
          No roles match these filters
        </p>
      )}
    </div>
  );
}
