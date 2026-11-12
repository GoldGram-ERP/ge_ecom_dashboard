import { describe, expect, it } from "vitest";
import { ApiError, errorMessage, fieldErrorsOf, readResponse } from "./api";
import { chartPoints } from "./chart";
import { cairoToday, formatDateTime, formatNumber, formatStamp } from "./format";
import { deliveryText, fulfilmentBadge, humanise, orderButton, ORDER_TABS, paymentBadge, STATUS_LABELS, statusChoices, statusNeedsConfirm } from "./labels";
import { buildHref, firstParam, parsePage } from "./query";
import { rulePreview } from "./rule-preview";

describe("order labels (spec 3.5 and the dashboard file)", () => {
  it("names the fulfilment column", () => {
    expect(fulfilmentBadge("initiated", "delivery")).toEqual(["Initiated", "info"]);
    expect(fulfilmentBadge("pending", "branch")).toEqual(["Initiated", "info"]);
    expect(fulfilmentBadge("processing", "storage")).toEqual(["Initiated", "info"]);
    expect(fulfilmentBadge("shipping", "delivery")).toEqual(["Shipping", "warn"]);
    expect(fulfilmentBadge("ready", "branch")).toEqual(["Ready for pickup", "warn"]);
    expect(fulfilmentBadge("completed", "delivery")).toEqual(["Delivered", "ok"]);
    expect(fulfilmentBadge("completed", "branch")).toEqual(["Collected", "ok"]);
    expect(fulfilmentBadge("completed", "storage")).toEqual(["Stored", "ok"]);
    expect(fulfilmentBadge("cancelled", "delivery")).toEqual(["Cancelled", "bad"]);
    expect(fulfilmentBadge("refund", "delivery")).toEqual(["Cancelled", "bad"]);
  });

  it("names the payment column", () => {
    expect(paymentBadge("initiated")).toEqual(["Pending", "mute"]);
    expect(paymentBadge("pending")).toEqual(["Pending", "warn"]);
    expect(paymentBadge("processing")).toEqual(["Verified", "info"]);
    expect(paymentBadge("shipping")).toEqual(["Confirmed", "ok"]);
    expect(paymentBadge("ready")).toEqual(["Confirmed", "ok"]);
    expect(paymentBadge("completed")).toEqual(["Confirmed", "ok"]);
    expect(paymentBadge("cancelled")).toEqual(["Cancelled", "bad"]);
    expect(paymentBadge("refund")).toEqual(["Refund initiated", "bad"]);
  });

  it("offers the file's button for each status", () => {
    expect(orderButton("initiated", false, false)).toEqual({ label: "Cancel", action: "cancel" });
    expect(orderButton("pending", false, false)).toEqual({ label: "Verify", action: "verify" });
    expect(orderButton("pending", true, false)).toEqual({ label: "Review", action: "review" });
    expect(orderButton("processing", false, false)).toEqual({ label: "Confirm", action: "confirm" });
    expect(orderButton("shipping", false, false)).toEqual({ label: "Mark delivered", action: "done" });
    expect(orderButton("ready", false, false)).toEqual({ label: "Mark collected", action: "done" });
    expect(orderButton("cancelled", false, false)).toEqual({ label: "Start refund", action: "refund" });
    expect(orderButton("refund", false, false)).toEqual({
      label: "Approve refund",
      action: "approve_refund",
    });
  });

  it("offers no button where the file shows none", () => {
    expect(orderButton("completed", false, false)).toBeNull();
    expect(orderButton("cancelled", false, true)).toBeNull();
  });

  it("names the delivery column", () => {
    expect(deliveryText("branch", null)).toEqual(["Pickup", "Branch"]);
    expect(deliveryText("delivery", "Giza")).toEqual(["Delivery", "Giza"]);
    expect(deliveryText("delivery", null)).toEqual(["Delivery", ""]);
    expect(deliveryText("storage", null)).toEqual(["Storage", "Insured storage"]);
  });

  it("lists the ten tabs in the file's order", () => {
    expect(ORDER_TABS.map(([key]) => key)).toEqual([
      "all",
      "initiated",
      "pending",
      "diff",
      "processing",
      "pickup",
      "delivery",
      "completed",
      "cancelled",
      "refund",
    ]);
    expect(ORDER_TABS[3][1]).toBe("Price difference");
  });

  it("reads a key it has not met as words", () => {
    expect(humanise("order_placed")).toBe("Order placed");
    expect(humanise("kafr_el_sheikh")).toBe("Kafr el sheikh");
    expect(humanise("")).toBe("—");
  });
});

describe("order status dropdown", () => {
  const DELIVERY = ["pending", "processing", "shipping", "completed", "cancelled"];

  it("offers the server's options in the dropdown's order, without refund or initiated", () => {
    expect(statusChoices("pending", ["cancelled", "refund", "completed", "initiated", "shipping", "processing", "pending", "bogus"]))
      .toEqual(["pending", "processing", "shipping", "completed", "cancelled"]);
    expect(statusChoices("ready", ["pending", "processing", "ready", "completed", "cancelled"]))
      .toEqual(["pending", "processing", "ready", "completed", "cancelled"]);
  });

  it("still shows a hidden current status as the selected value, first", () => {
    expect(statusChoices("refund", DELIVERY)).toEqual(["refund", ...DELIVERY]);
    expect(statusChoices("initiated", DELIVERY)).toEqual(["initiated", ...DELIVERY]);
    expect(statusChoices("shipping", [])).toEqual(["shipping"]);
  });

  it("asks before moving into or out of cancelled, and only then", () => {
    expect(statusNeedsConfirm("pending", "cancelled")).toBe(true);
    expect(statusNeedsConfirm("completed", "cancelled")).toBe(true);
    expect(statusNeedsConfirm("cancelled", "pending")).toBe(true);
    expect(statusNeedsConfirm("cancelled", "completed")).toBe(true);
    expect(statusNeedsConfirm("cancelled", "cancelled")).toBe(false);
    expect(statusNeedsConfirm("pending", "processing")).toBe(false);
    expect(statusNeedsConfirm("refund", "completed")).toBe(false);
  });

  it("has a word for every status", () => {
    expect(STATUS_LABELS.map(([status]) => status).sort()).toEqual(
      ["cancelled", "completed", "initiated", "pending", "processing", "ready", "refund", "shipping"],
    );
  });
});

describe("format", () => {
  it("shows dates in Cairo time, as the file's dt()", () => {
    // Cairo is UTC+3 in October 2026 (summer time) and UTC+2 in January.
    expect(formatStamp("2026-10-07T11:05:00.000Z")).toBe("07 Oct 14:05");
    expect(formatStamp("2026-01-15T22:30:00.000Z")).toBe("16 Jan 00:30");
    expect(formatDateTime("2026-01-15T22:30:00.000Z")).toBe("16 Jan 2026 00:30");
  });

  it("does not print Invalid Date", () => {
    expect(formatStamp("not a date")).toBe("—");
    expect(formatStamp(null)).toBe("—");
    expect(formatDateTime("")).toBe("—");
  });

  it("formats plain numbers as the file's f()", () => {
    expect(formatNumber(1284)).toBe("1,284");
    expect(formatNumber(1.256)).toBe("1.26");
    expect(formatNumber(-1.25)).toBe("-1.25");
    expect(formatNumber(1.26, 1)).toBe("1.3");
    expect(formatNumber(Number.NaN)).toBe("—");
  });

  it("gives today's date in Cairo", () => {
    expect(cairoToday(new Date("2026-10-07T21:30:00.000Z"))).toBe("2026-10-08");
    expect(cairoToday(new Date("2026-10-07T11:00:00.000Z"))).toBe("2026-10-07");
  });
});

describe("query", () => {
  it("reads the first value of a repeated parameter", () => {
    expect(firstParam(["a", "b"])).toBe("a");
    expect(firstParam(undefined)).toBe("");
    expect(firstParam("  x ")).toBe("x");
  });

  it("falls back to page 1 for anything that is not a positive whole number", () => {
    expect(parsePage("3")).toBe(3);
    for (const bad of ["0", "-1", "1.5", "abc", "", "1e3", undefined]) {
      expect(parsePage(bad)).toBe(1);
    }
  });

  it("builds bookmarkable links without empty values or page=1", () => {
    expect(buildHref("/orders", {})).toBe("/orders");
    expect(buildHref("/orders", { tab: "pending", q: "", page: 1 })).toBe("/orders?tab=pending");
    expect(buildHref("/orders", { tab: "diff", q: "ORD-1", page: 2 })).toBe(
      "/orders?tab=diff&q=ORD-1&page=2",
    );
    expect(buildHref("/customers", { q: "a b&c" })).toBe("/customers?q=a+b%26c");
  });
});

describe("chartPoints", () => {
  it("spreads the values across the width, lowest near the bottom", () => {
    expect(chartPoints([10, 20, 30], 640, 150)).toEqual(["0.0,140.0", "320.0,78.0", "640.0,16.0"]);
  });

  it("draws a flat line for one value or equal values", () => {
    expect(chartPoints([5], 640, 150)).toEqual(["0.0,140.0", "640.0,140.0"]);
    expect(chartPoints([5, 5], 640, 150)).toEqual(["0.0,140.0", "640.0,140.0"]);
  });

  it("draws nothing without values", () => {
    expect(chartPoints([], 640, 150)).toEqual([]);
  });
});

describe("rulePreview (the file's rpv)", () => {
  const today = "2026-10-07";
  const draft = { target: "labor", type: "percent", value: 50, validFrom: "2026-10-01", validTo: "" } as const;

  it("asks for a value first", () => {
    expect(rulePreview({ ...draft, value: 0 }, today)).toBe("Enter a value to preview the discount.");
    expect(rulePreview({ ...draft, value: Number.NaN }, today)).toBe(
      "Enter a value to preview the discount.",
    );
  });

  it("takes a percentage of the sample line", () => {
    expect(rulePreview(draft, today)).toBe(
      "On a 650 EGP labor line this takes off 325 EGP. Status on save: Active.",
    );
    expect(rulePreview({ ...draft, target: "shipping", value: 100 }, today)).toBe(
      "On a 100 EGP shipping line this takes off 100 EGP. Status on save: Active.",
    );
  });

  it("caps a fixed amount at the sample line", () => {
    expect(rulePreview({ ...draft, type: "fixed", value: 250 }, today)).toBe(
      "On a 650 EGP labor line this takes off 250 EGP. Status on save: Active.",
    );
    expect(rulePreview({ ...draft, target: "shipping", type: "fixed", value: 250 }, today)).toBe(
      "On a 100 EGP shipping line this takes off 100 EGP. Status on save: Active.",
    );
  });

  it("previews the status from the dates", () => {
    expect(rulePreview({ ...draft, validFrom: "" }, today)).toContain("Status on save: —.");
    expect(rulePreview({ ...draft, validFrom: "2026-11-01" }, today)).toContain("Status on save: Scheduled.");
    expect(rulePreview({ ...draft, validTo: "2026-10-06" }, today)).toContain("Status on save: Inactive.");
    expect(rulePreview({ ...draft, validTo: "2026-10-07" }, today)).toContain("Status on save: Active.");
  });
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api errors", () => {
  it("returns the body of a successful reply", async () => {
    await expect(readResponse(json(200, { status: "ok" }))).resolves.toEqual({ status: "ok" });
    await expect(readResponse(new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });

  it("turns the spec's error shape into an ApiError", async () => {
    const response = json(409, {
      statusCode: 409,
      code: "INVALID_TRANSITION",
      message: "An order that is completed cannot be verified.",
    });
    const error = await readResponse(response).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("INVALID_TRANSITION");
    expect((error as ApiError).status).toBe(409);
    expect(errorMessage(error)).toBe(
      "This order was already moved by someone else. The list has been refreshed.",
    );
  });

  it("treats a reply that is not in the spec's shape as an unreachable server", async () => {
    const error = await readResponse(new Response("Internal Server Error", { status: 500 })).catch(
      (caught: unknown) => caught,
    );
    expect((error as ApiError).code).toBe("UPSTREAM");
    expect(errorMessage(error)).toBe("Could not reach the server. Try again.");
    expect(errorMessage(new ApiError(0, "NETWORK", "x"))).toBe(
      "Could not reach the server. Try again.",
    );
  });

  it("names the fields of a validation failure", () => {
    const error = new ApiError(400, "VALIDATION_FAILED", "Invalid.", [
      { field: "laborPiastres", code: "invalid" },
      { field: "nameEn", code: "required" },
      { field: "nameEn", code: "invalid" },
    ]);
    expect(fieldErrorsOf(error)).toHaveLength(3);
    expect(errorMessage(error, { laborPiastres: "Labor (EGP)", nameEn: "Name (EN)" })).toBe(
      "The server refused these fields: Labor (EGP), Name (EN).",
    );
    expect(errorMessage(new ApiError(400, "VALIDATION_FAILED", "Invalid."))).toBe(
      "The server refused these values. Check them and try again.",
    );
  });

  it("has a plain sentence for each refusal the screens meet", () => {
    expect(errorMessage(new ApiError(403, "FORBIDDEN", "x"))).toBe("Your role does not allow this.");
    expect(errorMessage(new ApiError(409, "IN_USE", "x"))).toBe(
      "Still used elsewhere. Deactivate it instead.",
    );
    expect(errorMessage(new ApiError(409, "PRICE_JUMP", "x"))).toBe(
      "This moves the price by more than 5%.",
    );
    expect(errorMessage(new ApiError(401, "INVALID_CREDENTIALS", "x"))).toBe(
      "That email and password do not match a staff account.",
    );
    expect(errorMessage(new ApiError(429, "HTTP_429", "x"))).toBe(
      "Too many sign-in attempts. Wait a minute, then try again.",
    );
    expect(errorMessage(new TypeError("boom"))).toBe("Something went wrong. Try again.");
  });
});
