import { Locum } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { canSeeSalary, maskSalary } from "@/lib/permissions";

export function LocumListItem({ locum }: { locum: Locum }) {
  const { user } = useAuth();
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-4">
        <p className="text-sm font-semibold w-40 shrink-0 truncate">{locum.name}</p>
        <p className="text-xs text-muted-foreground w-32 shrink-0 truncate">{locum.speciality}</p>
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {locum.branchesCovered.map((branch) => (
            <Badge key={branch} variant="outline">
              {branch}
            </Badge>
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-32 shrink-0 truncate">License: {locum.licenseNumber}</span>
        <span className="text-xs font-medium w-28 shrink-0 text-right">
          {maskSalary(locum.dailyRate, user?.role)}
          {canSeeSalary(user?.role) ? "/day" : ""}
        </span>
        <Badge variant="outline" className="shrink-0">
          {locum.availability}
        </Badge>
      </CardContent>
    </Card>
  );
}
