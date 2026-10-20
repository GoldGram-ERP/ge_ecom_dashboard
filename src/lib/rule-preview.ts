import { formatNumber } from "./format";

export interface RuleDraft {
  target: "labor" | "shipping";
  type: "percent" | "fixed";
  /** What is typed in "Value": a percentage, or EGP. */
  value: number;
  validFrom: string;
  validTo: string;
}

/**
 * The file's rpv(): the sentence under the new-rule form while it is being filled in.
 * It is an illustration on a sample line (650 EGP of labor, 100 EGP of shipping), not a
 * price: the server works out every real discount.
 */
export function rulePreview(draft: RuleDraft, today: string): string {
  if (!(draft.value > 0)) return "Enter a value to preview the discount.";
  const base = draft.target === "labor" ? 650 : 100;
  const off = draft.type === "percent" ? (base * draft.value) / 100 : Math.min(draft.value, base);
  const status = !draft.validFrom
    ? "—"
    : draft.validFrom > today
      ? "Scheduled"
      : draft.validTo && draft.validTo < today
        ? "Inactive"
        : "Active";
  return `On a ${base} EGP ${draft.target} line this takes off ${formatNumber(off)} EGP. Status on save: ${status}.`;
}
