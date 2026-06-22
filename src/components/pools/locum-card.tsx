import { Locum } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LocumCard({ locum }: { locum: Locum }) {
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
          <span className="font-medium text-foreground">KES {locum.dailyRate.toLocaleString()}/day</span>
        </div>
        {locum.lastDeployed && (
          <p className="text-xs text-muted-foreground">Last deployed: {locum.lastDeployed}</p>
        )}
      </CardContent>
    </Card>
  );
}
