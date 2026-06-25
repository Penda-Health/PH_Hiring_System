"use client";

import { Offer } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCandidateForOffer, getRoleForOffer, daysUntilDeadline, JOIN_STATUS_STYLES } from "@/lib/offers-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { useAuth } from "@/lib/auth/auth-context";
import { maskSalary } from "@/lib/permissions";

export function OfferCard({
  offer,
  onAccept,
  onDecline,
  onCounter,
  onWithdraw,
}: {
  offer: Offer;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCounter: (id: string) => void;
  onWithdraw: (id: string) => void;
}) {
  const { candidates, openRoles, canEdit } = useRecruitmentData();
  const { user } = useAuth();
  const candidate = getCandidateForOffer(offer, candidates);
  const role = getRoleForOffer(offer, candidates, openRoles);
  const daysLeft = daysUntilDeadline(offer.deadline);
  const isActionable = canEdit && (offer.outcome === "Pending" || offer.outcome === "Negotiating");

  return (
    <Card
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit) return;
        e.dataTransfer.setData("text/offer-id", offer.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={canEdit ? "cursor-grab active:cursor-grabbing" : ""}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium leading-tight">{candidate?.name ?? "Unknown"}</p>
            {role && <p className="text-xs text-muted-foreground leading-tight">{role.title}</p>}
          </div>
          <Badge className={JOIN_STATUS_STYLES[offer.joined]}>{offer.joined}</Badge>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Offered: {maskSalary(offer.offeredSalary, user?.role)}</p>
          <p>Budgeted: {maskSalary(offer.budgetedSalary, user?.role)}</p>
          {offer.counterOfferAmount && <p>Counter: {maskSalary(offer.counterOfferAmount, user?.role)}</p>}
          {offer.finalAcceptedSalary && <p>Final: {maskSalary(offer.finalAcceptedSalary, user?.role)}</p>}
          {offer.startDate && <p>Start: {offer.startDate}</p>}
        </div>

        {isActionable && (
          <p className={`text-xs ${daysLeft < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {daysLeft < 0 ? `Deadline passed ${Math.abs(daysLeft)}d ago` : `${daysLeft}d to deadline`}
          </p>
        )}

        {isActionable && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button size="sm" className="h-7 px-2 text-xs bg-penda-teal hover:bg-penda-teal-dark" onClick={() => onAccept(offer.id)}>
              Accept
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onCounter(offer.id)}>
              Counter
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive" onClick={() => onDecline(offer.id)}>
              Decline
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => onWithdraw(offer.id)}>
              Withdraw
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
