"use client";

import * as React from "react";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { OFFER_OUTCOMES } from "@/lib/offers-helpers";
import { OfferColumn } from "@/components/offers/offer-column";
import { OfferActionDialog } from "@/components/offers/offer-action-dialog";
import { OfferOutcome } from "@/types";

type DialogState = { mode: "counter" | "decline" | "withdraw"; offerId: string } | null;

export default function OffersPage() {
  const { offers, acceptOffer, declineOffer, counterOffer, withdrawOffer, reopenOffer } = useRecruitmentData();
  const [dialog, setDialog] = React.useState<DialogState>(null);

  function handleDropOffer(offerId: string, targetOutcome: OfferOutcome) {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer || offer.outcome === targetOutcome) return;

    switch (targetOutcome) {
      case "Accepted":
        acceptOffer(offerId);
        break;
      case "Pending":
        reopenOffer(offerId);
        break;
      case "Negotiating":
        setDialog({ mode: "counter", offerId });
        break;
      case "Declined":
        setDialog({ mode: "decline", offerId });
        break;
      case "Withdrawn":
        setDialog({ mode: "withdraw", offerId });
        break;
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Offer Tracker</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {OFFER_OUTCOMES.map((outcome) => (
          <OfferColumn
            key={outcome}
            outcome={outcome}
            offers={offers.filter((o) => o.outcome === outcome)}
            onAccept={acceptOffer}
            onDecline={(id) => setDialog({ mode: "decline", offerId: id })}
            onCounter={(id) => setDialog({ mode: "counter", offerId: id })}
            onWithdraw={(id) => setDialog({ mode: "withdraw", offerId: id })}
            onDropOffer={handleDropOffer}
          />
        ))}
      </div>
      <OfferActionDialog
        mode={dialog?.mode ?? null}
        onOpenChange={(open) => !open && setDialog(null)}
        onSubmitCounter={(amount) => dialog && counterOffer(dialog.offerId, amount)}
        onSubmitReason={(reason) => {
          if (!dialog) return;
          if (dialog.mode === "decline") declineOffer(dialog.offerId, reason);
          if (dialog.mode === "withdraw") withdrawOffer(dialog.offerId, reason);
        }}
      />
    </div>
  );
}
