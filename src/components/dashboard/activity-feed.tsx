import { Mail, MessageSquare, FolderOpen, Sheet as SheetIcon, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { automationLog } from "@/lib/mock-data";
import { AutomationLogEntry } from "@/types";

const CHANNEL_ICONS: Record<AutomationLogEntry["channel"], typeof Mail> = {
  Email: Mail,
  SMS: MessageSquare,
  Drive: FolderOpen,
  Sheets: SheetIcon,
  Airtable: Database,
};

const STATUS_STYLES: Record<AutomationLogEntry["status"], string> = {
  Success: "bg-penda-teal-light text-penda-teal-dark border-transparent",
  Retrying: "bg-high-bg text-high-fg border-transparent",
  Failed: "bg-critical-bg text-critical-fg border-transparent",
};

export function ActivityFeed() {
  const sorted = [...automationLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automation Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.slice(0, 6).map((entry) => {
          const Icon = CHANNEL_ICONS[entry.channel];
          return (
            <div key={entry.id} className="flex items-start gap-3 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-tight">{entry.trigger}</p>
                <p className="text-xs text-muted-foreground truncate">{entry.detail}</p>
              </div>
              <Badge className={STATUS_STYLES[entry.status]}>{entry.status}</Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
