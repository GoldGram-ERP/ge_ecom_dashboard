// Money helpers. The API speaks integer piastres (1 EGP = 100 piastres); staff read and
// type EGP. Everything here is integer or string arithmetic: no float ever touches an amount.

export type MoneyParseError =
  | "empty"
  | "not_a_number"
  | "negative"
  | "too_many_decimals"
  | "too_large";

export type MoneyParseResult =
  | { ok: true; piastres: number }
  | { ok: false; reason: MoneyParseError };

const PLAIN = /^\d+(\.\d+)?$/;
const GROUPED = /^\d{1,3}(,\d{3})+(\.\d+)?$/;
/** Whole pounds beyond this many digits cannot be a real amount and risk unsafe integers. */
const MAX_POUND_DIGITS = 12;

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function split(piastres: number): { sign: string; pounds: string; cents: string } | null {
  if (!Number.isSafeInteger(piastres)) return null;
  const abs = Math.abs(piastres);
  return {
    sign: piastres < 0 ? "-" : "",
    pounds: String(Math.trunc(abs / 100)),
    cents: String(abs % 100).padStart(2, "0"),
  };
}

/** `172600` → `1,726`; `618420` → `6,184.20`. Decimals appear only when there are piastres. */
export function formatEgp(piastres: number): string {
  const parts = split(piastres);
  if (!parts) return "—";
  const whole = `${parts.sign}${group(parts.pounds)}`;
  return parts.cents === "00" ? whole : `${whole}.${parts.cents}`;
}

/**
 * A difference with its direction, as the dashboard file prints it:
 * `2500` → `+25`, `-12540` → `−125.40` (a real minus sign), `0` → `0`.
 */
export function formatSigned(piastres: number): string {
  const parts = split(piastres);
  if (!parts) return "—";
  const sign = piastres > 0 ? "+" : piastres < 0 ? "−" : "";
  return `${sign}${formatEgp(Math.abs(piastres))}`;
}

/** Always two decimals, for per-gram prices: `618400` → `6,184.00`. */
export function formatEgpFixed(piastres: number): string {
  const parts = split(piastres);
  if (!parts) return "—";
  return `${parts.sign}${group(parts.pounds)}.${parts.cents}`;
}

/** The value to prefill an amount input with: `618420` → `6184.20`, `34000` → `340`. */
export function piastresToInput(piastres: number, fixed = false): string {
  const parts = split(piastres);
  if (!parts) return "";
  if (!fixed && parts.cents === "00") return `${parts.sign}${parts.pounds}`;
  return `${parts.sign}${parts.pounds}.${parts.cents}`;
}

/**
 * Turns what staff typed (`6184.20`, `340`, `6,184.20`) into piastres.
 * Rejects empty, non-numeric, negative and more-than-two-decimal input.
 * A comma is accepted only as a correctly placed thousands separator, so `6184,20` is refused
 * instead of being read as either 6,184.20 or 618,420.
 */
export function parseEgpToPiastres(input: string): MoneyParseResult {
  const text = input.trim();
  if (text === "") return { ok: false, reason: "empty" };
  if (/^[-−]\s*[\d.,]+$/.test(text)) return { ok: false, reason: "negative" };

  let plain: string;
  if (PLAIN.test(text)) plain = text;
  else if (GROUPED.test(text)) plain = text.replaceAll(",", "");
  else return { ok: false, reason: "not_a_number" };

  const [rawPounds, cents = ""] = plain.split(".");
  if (cents.length > 2) return { ok: false, reason: "too_many_decimals" };
  const pounds = rawPounds.replace(/^0+(?=\d)/, "");
  if (pounds.length > MAX_POUND_DIGITS) return { ok: false, reason: "too_large" };

  return { ok: true, piastres: Number(pounds) * 100 + Number(cents.padEnd(2, "0")) };
}

const PARSE_MESSAGES: Record<MoneyParseError, string> = {
  empty: "Enter an amount.",
  not_a_number: "Enter a number such as 6184.20.",
  negative: "The amount cannot be negative.",
  too_many_decimals: "Use at most 2 decimal places.",
  too_large: "That amount is too large.",
};

export function moneyParseMessage(reason: MoneyParseError): string {
  return PARSE_MESSAGES[reason];
}

/** Labor is typed per gram; this is the piece's labor, shown in the products and cashback tables. Display only: the price adds labor as typed. */
export const totalLaborPiastres = (item: { laborPiastres: number; weightGrams: number }): number =>
  Math.round(item.laborPiastres * item.weightGrams);
