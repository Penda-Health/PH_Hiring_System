import { Phone } from "lucide-react";
import { Reliever } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_STYLES: Record<Reliever["status"], string> = {
  Active: "bg-penda-teal-light text-penda-teal-dark border-transparent",
  Inactive: "bg-muted text-muted-foreground border-transparent",
};

export function RelieverCard({ reliever }: { reliever: Reliever }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <CardTitle className="text-base">{reliever.name}</CardTitle>
        <Badge className={STATUS_STYLES[reliever.status]}>{reliever.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{reliever.role}</p>
        <div className="flex flex-wrap gap-1">
          {reliever.branchesCovered.map((branch) => (
            <Badge key={branch} variant="outline">
              {branch}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Available: {reliever.availabilityDates}</p>
        {reliever.notes && <p className="text-xs text-muted-foreground italic">{reliever.notes}</p>}
        <a href={`tel:${reliever.phone}`} className="flex items-center gap-1.5 text-xs text-penda-teal hover:underline">
          <Phone className="h-3.5 w-3.5" /> {reliever.phone}
        </a>
      </CardContent>
    </Card>
  );
}
