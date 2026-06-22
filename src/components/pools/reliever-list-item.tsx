import { Phone } from "lucide-react";
import { Reliever } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_STYLES: Record<Reliever["status"], string> = {
  Active: "bg-penda-teal-light text-penda-teal-dark border-transparent",
  Inactive: "bg-muted text-muted-foreground border-transparent",
};

export function RelieverListItem({ reliever }: { reliever: Reliever }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-4">
        <p className="text-sm font-semibold w-40 shrink-0 truncate">{reliever.name}</p>
        <p className="text-xs text-muted-foreground w-36 shrink-0 truncate">{reliever.role}</p>
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {reliever.branchesCovered.map((branch) => (
            <Badge key={branch} variant="outline">
              {branch}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground w-40 shrink-0 truncate">{reliever.availabilityDates}</p>
        <Badge className={STATUS_STYLES[reliever.status]}>{reliever.status}</Badge>
        <a href={`tel:${reliever.phone}`} className="flex items-center gap-1.5 text-xs text-penda-teal hover:underline shrink-0">
          <Phone className="h-3.5 w-3.5" /> {reliever.phone}
        </a>
      </CardContent>
    </Card>
  );
}
