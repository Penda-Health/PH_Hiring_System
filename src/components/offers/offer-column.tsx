import * as React from "react";
import { Offer, OfferOutcome } from "@/types";
import { OfferCard } from "./offer-card";

export function OfferColumn({
  outcome,
  offers,
  onAccept,
  onDecline,
  onCounter,
  onWithdraw,
  onDropOffer,
}: {
  outcome: OfferOutcome;
  offers: Offer[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onCounter: (id: string) => void;
  onWithdraw: (id: string) => void;
  onDropOffer: (offerId: string, targetOutcome: OfferOutcome) => void;
}) {
  const [isDragOver, setIsDragOver] = React.useState(false);

  return (
    <div
      className={`flex flex-col w-64 shrink-0 rounded-md transition-colors ${
        isDragOver ? "bg-penda-teal/10 ring-1 ring-penda-teal" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const offerId = e.dataTransfer.getData("text/offer-id");
        if (offerId) onDropOffer(offerId, outcome);
      }}
    >
      <div className="flex items-center justify-between px-2 py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h3 className="text-sm font-semibold">{outcome}</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{offers.length}</span>
      </div>
      <div className="space-y-2 px-1 min-h-16">
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            onAccept={onAccept}
            onDecline={onDecline}
            onCounter={onCounter}
            onWithdraw={onWithdraw}
          />
        ))}
        {offers.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">No offers</p>
        )}
      </div>
    </div>
  );
}
