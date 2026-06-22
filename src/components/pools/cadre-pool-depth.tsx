import { Reliever } from "@/types";
import { getCadrePoolDepth } from "@/lib/pools-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function CadrePoolDepth({ relievers }: { relievers: Reliever[] }) {
  const rows = getCadrePoolDepth(relievers);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reliever Pool Depth by Cadre</CardTitle>
        <p className="text-xs text-muted-foreground">Target: at least {rows[0]?.target ?? 3} active relievers per IPS cadre</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.cadre} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{row.cadre}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {row.count}/{row.target}
                </span>
                <Badge
                  className={
                    row.met
                      ? "bg-penda-teal-light text-penda-teal-dark border-transparent"
                      : "bg-critical-bg text-critical-fg border-transparent"
                  }
                >
                  {row.met ? "Covered" : "Gap"}
                </Badge>
              </div>
            </div>
            <Progress value={Math.min((row.count / row.target) * 100, 100)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
