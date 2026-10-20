// The words the dashboard file prints for the server's order values (spec 3.5).
// A badge is [label, colour class]: ok, warn, bad, info or mute.
import type { Fulfilment, OrderStatus, OrderTab } from "./types";

export type BadgeText = [label: string, colour: string];

/** The file's `TABS`, in its order. */
export const ORDER_TABS: [OrderTab, string][] = [
  ["all", "Total"],
  ["initiated", "Initiated"],
  ["pending", "Pending"],
  ["diff", "Price difference"],
  ["processing", "Processing"],
  ["pickup", "Pickup"],
  ["delivery", "Delivery"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["refund", "Refund initiated"],
];

/** The "Fulfilment" column (the file's `FU`). */
export function fulfilmentBadge(status: OrderStatus, fulfilment: Fulfilment): BadgeText {
  switch (status) {
    case "shipping":
      return ["Shipping", "warn"];
    case "ready":
      return ["Ready for pickup", "warn"];
    case "completed":
      if (fulfilment === "branch") return ["Collected", "ok"];
      if (fulfilment === "storage") return ["Stored", "ok"];
      return ["Delivered", "ok"];
    case "cancelled":
    case "refund":
      return ["Cancelled", "bad"];
    default:
      return ["Initiated", "info"];
  }
}

/** The "Status" column (the file's `ST`). */
export function paymentBadge(status: OrderStatus): BadgeText {
  switch (status) {
    case "initiated":
      return ["Pending", "mute"];
    case "pending":
      return ["Pending", "warn"];
    case "processing":
      return ["Verified", "info"];
    case "shipping":
    case "ready":
    case "completed":
      return ["Confirmed", "ok"];
    case "cancelled":
      return ["Cancelled", "bad"];
    default:
      return ["Refund initiated", "bad"];
  }
}

/** The "Delivery" column: the type, and the line under it. */
export function deliveryText(fulfilment: Fulfilment, zoneName: string | null): [string, string] {
  if (fulfilment === "branch") return ["Pickup", "Branch"];
  if (fulfilment === "storage") return ["Storage", "Insured storage"];
  return ["Delivery", zoneName ?? ""];
}

export interface OrderButton {
  label: string;
  /** An action of spec 3.5, or "review" to open the price-difference dialog. */
  action: "cancel" | "verify" | "review" | "confirm" | "done" | "refund" | "approve_refund";
}

/** The one button a row offers, by status (the file's `A`). Null when the file shows none. */
export function orderButton(
  status: OrderStatus,
  overTolerance: boolean,
  refunded: boolean,
): OrderButton | null {
  switch (status) {
    case "initiated":
      return { label: "Cancel", action: "cancel" };
    case "pending":
      return overTolerance
        ? { label: "Review", action: "review" }
        : { label: "Verify", action: "verify" };
    case "processing":
      return { label: "Confirm", action: "confirm" };
    case "shipping":
      return { label: "Mark delivered", action: "done" };
    case "ready":
      return { label: "Mark collected", action: "done" };
    case "cancelled":
      return refunded ? null : { label: "Start refund", action: "refund" };
    case "refund":
      return { label: "Approve refund", action: "approve_refund" };
    default:
      return null;
  }
}

/** `order_placed` → `Order placed`, so any message kind reads as words. */
export function humanise(key: string): string {
  const words = key.replaceAll("_", " ").trim();
  return words === "" ? "—" : words.charAt(0).toUpperCase() + words.slice(1);
}

/** What each kind of system-log line is called, and its colour. */
export const LOG_SOURCES: Record<string, [label: string, tone: "ok" | "warn" | "info" | "mute"]> = {
  message: ["Message", "info"],
  order: ["Order", "ok"],
  kyc: ["KYC", "warn"],
  price: ["Price", "mute"],
};
