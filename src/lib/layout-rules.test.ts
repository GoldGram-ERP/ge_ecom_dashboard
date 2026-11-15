import { describe, expect, it } from "vitest";
import { toArabic } from "@/i18n/translate";
import { ApiError, errorMessage } from "./api";
import { addPopular, blankGroup, blankLink, kindOf, layoutLabels, moveItem, pageChoices, POPULAR_MAX, toggleSection, toPayload, withKind } from "./layout-rules";
import { HOME_SECTIONS, type Layout, type TargetPage } from "./seo-api";

const page = (target: string, type: TargetPage["type"], en: string): TargetPage => ({ target, type, name: { en, ar: en }, path: `/${en}` });

describe("home sections order", () => {
  it("moves a section by one place and never above the hero", () => {
    const order = [...HOME_SECTIONS];
    expect(moveItem(order, 3, -1, 1).slice(0, 4)).toEqual(["hero", "prices", "forms", "weights"]);
    expect(moveItem(order, 1, -1, 1)).toEqual(order);
    expect(moveItem(order, 0, 1, 1)).toEqual(order);
    expect(moveItem(order, order.length - 1, 1, 1)).toEqual(order);
  });
  it("hides and shows a section, never the hero", () => {
    expect(toggleSection([], "record")).toEqual(["record"]);
    expect(toggleSection(["record"], "record")).toEqual([]);
    expect(toggleSection([], "hero")).toEqual([]);
  });
});

describe("popular products", () => {
  it("adds in order, once, up to the limit", () => {
    expect(addPopular([3], 5)).toEqual([3, 5]);
    expect(addPopular([3], 3)).toEqual([3]);
    const full = Array.from({ length: POPULAR_MAX }, (_, i) => i + 1);
    expect(addPopular(full, 99)).toEqual(full);
  });
});

describe("links", () => {
  it("holds a page or an address, never both", () => {
    const link = { ...blankLink(), target: "static:about" };
    expect(withKind(link, "address").target).toBe("");
    const address = withKind({ ...blankLink(), url: "/x" }, "address");
    expect(withKind(address, "page").url).toBe("");
    expect(kindOf({ ...blankLink(), kind: undefined, url: "/x" })).toBe("address");
    expect(kindOf(blankLink())).toBe("page");
  });
  it("sends only what the API knows, trimmed", () => {
    const layout: Layout = {
      home: { order: [...HOME_SECTIONS], hidden: [], popularIds: [] },
      menus: { header: [{ ...blankGroup(), kind: "address", url: " /x ", label: { en: " A ", ar: "ب" }, children: [{ ...blankLink(), target: "product:1" }] }], footer: [] },
    };
    const sent = toPayload(layout).menus.header[0];
    expect(sent).toEqual({ label: { en: "A", ar: "ب" }, target: "", url: "/x", children: [{ label: { ar: "", en: "" }, target: "product:1", url: "" }] });
    expect("kind" in sent).toBe(false);
  });
  it("offers pages by type, filtered by search, always keeping the chosen one", () => {
    const pages = [page("product:1", "product", "Ring"), page("static:about", "static", "About"), page("brand:2", "brand", "Ring brand")];
    const order = ["static", "category", "weight", "brand", "product", "guide"];
    expect(pageChoices(pages, "", "", order).map((p) => p.target)).toEqual(["static:about", "brand:2", "product:1"]);
    expect(pageChoices(pages, "ring", "static:about", order).map((p) => p.target)).toEqual(["static:about", "brand:2", "product:1"]);
    expect(pageChoices(pages, "zzz", "", order)).toEqual([]);
  });
  it("names the API's field paths for staff", () => {
    const layout: Layout = { home: { order: [], hidden: [], popularIds: [] }, menus: { header: [{ ...blankGroup(), children: [blankLink()] }], footer: [] } };
    const labels = layoutLabels(layout, (x) => x);
    expect(labels["menus.header[0].children[0].url"]).toBe("Header menu, entry 1, link 1 › address");
    expect(labels["menus.header[0].label.en"]).toBe("Header menu, entry 1 › English label");
  });
  it("a refused save reads fully in Arabic", () => {
    const layout: Layout = { home: { order: [], hidden: [], popularIds: [] }, menus: { header: [{ ...blankGroup(), children: [blankLink()] }], footer: [] } };
    const refusal = new ApiError(400, "VALIDATION_FAILED", "x", [{ field: "menus.header[0].children[0].label", code: "required" }]);
    const ar = toArabic(errorMessage(refusal, layoutLabels(layout, toArabic)));
    expect(ar).not.toMatch(/[A-Za-z]/);
  });
});
