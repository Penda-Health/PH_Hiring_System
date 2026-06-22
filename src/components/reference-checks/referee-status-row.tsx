import { Mail, MessageSquare, CheckCircle2, Circle } from "lucide-react";
import { RefereeStatus } from "@/types";

export function RefereeStatusRow({ referee }: { referee: RefereeStatus }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{referee.name}</p>
        <p className="text-xs text-muted-foreground">{referee.phone}</p>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <Mail className={`h-4 w-4 ${referee.emailSent ? "text-penda-teal" : ""}`} />
        <MessageSquare className={`h-4 w-4 ${referee.smsSent ? "text-penda-teal" : ""}`} />
        {referee.responded ? (
          <CheckCircle2 className="h-4 w-4 text-penda-teal" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </div>
    </div>
  );
}
