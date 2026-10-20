import { describe, expect, it } from "vitest";
import {
  formatEgp,
  formatEgpFixed,
  formatSigned,
  parseEgpToPiastres,
  piastresToInput,
} from "./money";

describe("formatEgp", () => {
  it("shows whole-pound amounts without decimals", () => {
    expect(formatEgp(172600)).toBe("1,726");
    expect(formatEgp(0)).toBe("0");
    expect(formatEgp(100)).toBe("1");
    expect(formatEgp(19235000)).toBe("192,350");
    expect(formatEgp(123456789000)).toBe("1,234,567,890");
  });

  it("shows two decimals when there are piastres", () => {
    expect(formatEgp(618420)).toBe("6,184.20");
    expect(formatEgp(5)).toBe("0.05");
    expect(formatEgp(99)).toBe("0.99");
    expect(formatEgp(100001)).toBe("1,000.01");
  });

  it("keeps the sign of a negative amount", () => {
    expect(formatEgp(-172600)).toBe("-1,726");
    expect(formatEgp(-5)).toBe("-0.05");
  });

  it("does not invent a number from a non-integer", () => {
    expect(formatEgp(Number.NaN)).toBe("—");
    expect(formatEgp(12.5)).toBe("—");
    expect(formatEgp(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatEgpFixed", () => {
  it("always shows two decimals", () => {
    expect(formatEgpFixed(618420)).toBe("6,184.20");
    expect(formatEgpFixed(618400)).toBe("6,184.00");
    expect(formatEgpFixed(7)).toBe("0.07");
  });
});

describe("piastresToInput", () => {
  it("gives a value an amount field can be prefilled with", () => {
    expect(piastresToInput(618420)).toBe("6184.20");
    expect(piastresToInput(34000)).toBe("340");
    expect(piastresToInput(34000, true)).toBe("340.00");
    expect(piastresToInput(0)).toBe("0");
  });

  it("round-trips through the parser", () => {
    for (const piastres of [0, 1, 99, 100, 18000, 618420, 604100, 100_000_000]) {
      expect(parseEgpToPiastres(piastresToInput(piastres))).toEqual({ ok: true, piastres });
      expect(parseEgpToPiastres(piastresToInput(piastres, true))).toEqual({ ok: true, piastres });
    }
  });
});

describe("parseEgpToPiastres", () => {
  it("converts typed EGP to piastres", () => {
    expect(parseEgpToPiastres("6184.20")).toEqual({ ok: true, piastres: 618420 });
    expect(parseEgpToPiastres("340")).toEqual({ ok: true, piastres: 34000 });
    expect(parseEgpToPiastres("6184.2")).toEqual({ ok: true, piastres: 618420 });
    expect(parseEgpToPiastres("0.05")).toEqual({ ok: true, piastres: 5 });
    expect(parseEgpToPiastres("0")).toEqual({ ok: true, piastres: 0 });
    expect(parseEgpToPiastres("  340  ")).toEqual({ ok: true, piastres: 34000 });
    expect(parseEgpToPiastres("007")).toEqual({ ok: true, piastres: 700 });
  });

  it("is exact where floating point is not", () => {
    // parseFloat("1.15") * 100 is 114.99999999999999; 0.57 * 100 is 56.99999999999999.
    expect(parseEgpToPiastres("1.15")).toEqual({ ok: true, piastres: 115 });
    expect(parseEgpToPiastres("0.57")).toEqual({ ok: true, piastres: 57 });
    expect(parseEgpToPiastres("8.20")).toEqual({ ok: true, piastres: 820 });
    expect(parseEgpToPiastres("4.35")).toEqual({ ok: true, piastres: 435 });
    expect(parseEgpToPiastres("1000000.29")).toEqual({ ok: true, piastres: 100000029 });
  });

  it("accepts correctly placed thousands separators", () => {
    expect(parseEgpToPiastres("6,184.20")).toEqual({ ok: true, piastres: 618420 });
    expect(parseEgpToPiastres("1,000,000")).toEqual({ ok: true, piastres: 100000000 });
  });

  it("rejects empty input", () => {
    expect(parseEgpToPiastres("")).toEqual({ ok: false, reason: "empty" });
    expect(parseEgpToPiastres("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects more than two decimals", () => {
    expect(parseEgpToPiastres("6184.205")).toEqual({ ok: false, reason: "too_many_decimals" });
    expect(parseEgpToPiastres("1.000")).toEqual({ ok: false, reason: "too_many_decimals" });
    expect(parseEgpToPiastres("6,184.205")).toEqual({ ok: false, reason: "too_many_decimals" });
  });

  it("rejects negatives", () => {
    expect(parseEgpToPiastres("-5")).toEqual({ ok: false, reason: "negative" });
    expect(parseEgpToPiastres("-0.01")).toEqual({ ok: false, reason: "negative" });
    expect(parseEgpToPiastres("−340")).toEqual({ ok: false, reason: "negative" });
  });

  it("rejects anything that is not a plain number", () => {
    for (const text of [
      "abc",
      "12abc",
      "1e3",
      "0x10",
      "6184,20",
      "61,84.20",
      "1.2.3",
      ".5",
      "5.",
      "+5",
      "5 000",
      "EGP 340",
      "٣٤٠",
      "NaN",
      "Infinity",
      "-",
    ]) {
      expect(parseEgpToPiastres(text), text).toEqual({ ok: false, reason: "not_a_number" });
    }
  });

  it("rejects amounts too large to be exact", () => {
    expect(parseEgpToPiastres("1234567890123")).toEqual({ ok: false, reason: "too_large" });
    const largest = parseEgpToPiastres("999999999999.99");
    expect(largest).toEqual({ ok: true, piastres: 99999999999999 });
  });
});

describe("formatSigned", () => {
  it("prints the direction as the dashboard file does", () => {
    expect(formatSigned(2500)).toBe("+25");
    expect(formatSigned(-12540)).toBe("−125.40");
    expect(formatSigned(0)).toBe("0");
    expect(formatSigned(429500)).toBe("+4,295");
  });

  it("does not invent a number from a non-integer", () => {
    expect(formatSigned(Number.NaN)).toBe("—");
    expect(formatSigned(0.5)).toBe("—");
  });
});