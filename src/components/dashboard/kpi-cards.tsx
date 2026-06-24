import { Briefcase, Users, AlertTriangle, HandCoins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getKpis } from "@/lib/dashboard-metrics";
import { Candidate, Offer, OpenRole } from "@/types";

const ICONS = { openRolesCount: Briefcase, activePipeline: Users, totalHcGap: AlertTriangle, pendingOffers: HandCoins };

export function KpiCards({
  openRoles,
  candidates,
  offers,
}: {
  openRoles: OpenRole[];
  candidates: Candidate[];
  offers: Offer[];
}) {
  const kpis = getKpis(openRoles, candidates, offers);

  const cards = [
    { key: "openRolesCount", label: "Open Roles", value: kpis.openRolesCount },
    { key: "activePipeline", label: "Active in Pipeline", value: kpis.activePipeline },
    { key: "totalHcGap", label: "Headcount Gap", value: kpis.totalHcGap },
    { key: "pendingOffers", label: "Offers Pending", value: kpis.pendingOffers },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = ICONS[card.key];
        return (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <Icon className="h-4 w-4 text-penda-teal" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
