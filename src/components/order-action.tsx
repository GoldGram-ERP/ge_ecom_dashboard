"use client";

import { T } from "@/components/t";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { orderButton } from "@/lib/labels";
import { formatEgp, formatSigned } from "@/lib/money";
import type { OrderDetail, OrderStatus } from "@/lib/types";
import { Modal } from "./modal";
import { toast } from "./toast";

// The toast for each action of spec 3.5.
const DONE: Record<string, string> = {
  verify: "Payment verified",
  cancel: "Order cancelled",
  confirm: "Order confirmed",
  done: "Order completed",
  refund: "Refund started",
  approve_refund: "Refund approved",
  accept: "Accepted at the quoted price",
  requote: "Re-quoted at the current price",
  cancel_refund: "Cancelled, refund started",
};

/**
 * The one button an order offers for its status, and the "Review price difference" dialog.
 * Used by the home screen's attention list, the orders table and the order page. The server
 * decides whether the move is allowed.
 */
export function OrderAction({
  id,
  status,
  overTolerance,
  refunded,
  tolerancePct,
}: {
  id: number;
  status: OrderStatus;
  overTolerance: boolean;
  refunded: boolean;
  tolerancePct: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<OrderDetail | null>(null);
  const button = orderButton(status, overTolerance, refunded);

  /** Opens the dialog with the figures the server holds at this moment. */
  async function openReview() {
    setBusy(true);
    try {
      const order = await api<OrderDetail>(`/admin/orders/${id}`);
      if (order.live && order.repricedTotalPiastres !== null) {
        setReview(order);
      } else {
        toast(errorMessage(new ApiError(409, "INVALID_TRANSITION", "")));
        router.refresh();
      }
    } catch (error) {
      toast(errorMessage(error));
    }
    setBusy(false);
  }

  async function act(action: string) {
    setBusy(true);
    try {
      await api(`/admin/orders/${id}/action`, { method: "POST", body: { action } });
    } catch (error) {
      setBusy(false);
      const code = error instanceof ApiError ? error.code : "";
      if (code === "NEEDS_REVIEW") {
        // The price moved past the tolerance since the list was loaded.
        router.refresh();
        await openReview();
        return;
      }
      toast(errorMessage(error));
      if (code === "UNAUTHENTICATED") router.replace("/login");
      if (code === "INVALID_TRANSITION" || code === "NOT_FOUND") {
        setReview(null);
        router.refresh();
      }
      return;
    }
    setBusy(false);
    setReview(null);
    toast(DONE[action]);
    router.refresh();
  }

  return (
    <>
      {button ? (
        <Button
          size="sm"
          variant={button.action === "cancel" ? "destructive" : button.action === "review" ? "gold" : "outline"}
          disabled={busy}
          onClick={() => (button.action === "review" ? openReview() : act(button.action))}
        >
          {button.label}
        </Button>
      ) : null}
      {review ? (
        <Modal
          title={`Review price difference · #${review.id}`}
          description={`Gold moved while the customer was paying.${tolerancePct === null ? "" : ` Tolerance is ${formatNumber(tolerancePct)}%.`}`}
          onClose={() => setReview(null)}
        >
          <dl className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground"><T>Quoted total</T></dt>
              <dd className="num text-base font-medium">{formatEgp(review.quotedTotalPiastres)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground"><T>Re-priced at current gold</T></dt>
              <dd className="num text-base font-medium">{formatEgp(review.repricedTotalPiastres ?? Number.NaN)}</dd>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <dt className="text-muted-foreground"><T>Difference</T></dt>
              <dd className={`num text-base font-medium text-destructive`}>
                {formatSigned(review.differencePiastres ?? Number.NaN)} ({formatNumber(review.differencePct ?? Number.NaN)}%)
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="gold" disabled={busy} onClick={() => act("accept")}>
              <T>Accept at original price</T>
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => act("requote")}>
              <T>Re-quote the customer</T>
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => act("cancel_refund")}>
              <T>Cancel and refund</T>
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
