import type { Tone } from "@/components/parts";
import type { SellRequest } from "@/lib/types";

/** The words staff see for a sell request's fields (English; `<T>` gives the Arabic). */
export const SELL_STATUS: Record<SellRequest["status"], [string, Tone]> = {
  new: ["New", "warn"],
  contacted: ["Contacted", "info"],
  completed: ["Completed", "ok"],
  cancelled: ["Cancelled", "mute"],
};
export const SELL_KIND: Record<SellRequest["kind"], string> = { bar: "Bar", coin: "Coin" };
export const SELL_CONDITION: Record<SellRequest["condition"], string> = {
  sealed_invoice: "Sealed, with invoice",
  sealed: "Sealed, no invoice",
  opened: "Packaging opened",
};
export const SELL_HANDOVER: Record<SellRequest["handover"], string> = { branch: "At the branch", courier: "Courier collects" };
export const SELL_PAYOUT: Record<SellRequest["payout"], string> = { cash: "Cash at the branch", instapay: "InstaPay", bank: "Bank transfer" };
