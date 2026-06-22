import { Locum, Reliever } from "@/types";
import { branchClusters, standaloneBranches } from "@/lib/mock-data/clusters";
import { getZoneCoverage } from "@/lib/pools-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ClusterCoverage({ relievers, locums }: { relievers: Reliever[]; locums: Locum[] }) {
  const zones = getZoneCoverage(relievers, locums);
  const zoneBranches = new Map<string, string[]>([
    ...branchClusters.map((c): [string, string[]] => [c.name, c.branches]),
    ...standaloneBranches.map((b): [string, string[]] => [b, [b]]),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cluster Coverage</CardTitle>
        <p className="text-xs text-muted-foreground">
          Branches grouped by the cluster a reliever or locum can be deployed across
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {zones.map((zone) => (
          <div key={zone.zone} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{zone.zone}</span>
              <Badge
                className={
                  zone.covered
                    ? "bg-penda-teal-light text-penda-teal-dark border-transparent"
                    : "bg-critical-bg text-critical-fg border-transparent"
                }
              >
                {zone.covered ? "Covered" : "Uncovered"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{(zoneBranches.get(zone.zone) ?? []).join(", ")}</p>
            <div className="flex flex-wrap gap-1">
              {zone.relievers.map((r) => (
                <Badge key={r.id} variant="outline">
                  {r.name} · {r.role}
                </Badge>
              ))}
              {zone.locums.map((l) => (
                <Badge key={l.id} variant="outline">
                  {l.name} · {l.speciality}
                </Badge>
              ))}
              {zone.relievers.length === 0 && zone.locums.length === 0 && (
                <span className="text-xs text-muted-foreground">No reliever or locum assigned</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
