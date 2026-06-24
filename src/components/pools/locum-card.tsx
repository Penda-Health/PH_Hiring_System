import { Locum } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { canSeeSalary, maskSalary } from "@/lib/permissions";

export function LocumCard({ locum }: { locum: Locum }) {
  const { user } = useAuth();
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <CardTitle className="text-base">{locum.name}</CardTitle>
        <Badge variant="outline">{locum.availability}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{locum.speciality}</p>
        <div className="flex flex-wrap gap-1">
          {locum.branchesCovered.map((branch) => (
            <Badge key={branch} variant="outline">
              {branch}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>License: {locum.licenseNumber}</span>
          <span className="font-medium text-foreground">
            {maskSalary(locum.dailyRate, user?.role)}
            {canSeeSalary(user?.role) ? "/day" : ""}
          </span>
        </div>
        {locum.lastDeployed && (
          <p className="text-xs text-muted-foreground">Last deployed: {locum.lastDeployed}</p>
        )}
      </CardContent>
    </Card>
  );
}
