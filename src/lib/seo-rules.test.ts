import { describe, expect, it } from "vitest";
import { entryOrDefault } from "./seo-api";
import {
  altProblem,
  fillTemplate,
  headCodeProblem,
  lengthWarning,
  pageTypeOf,
  previewTrim,
  publicPath,
  redirectEffect,
  redirectProblem,
  robotsProblem,
  DEFAULT_ROBOTS,
  sitemapLock,
  slugProblem,
  unknownVariables,
  urlProblem,
} from "./seo-rules";
import { TEMPLATE_VARIABLES } from "./seo-api";

const text = (n: number) => "a".repeat(n);

describe("title and description counters (DSH-01)", () => {
  it("warns on a title above 60 characters only", () => {
    expect(lengthWarning("title", text(60))).toBeNull();
    expect(lengthWarning("title", text(61))).toBe("long");
    expect(lengthWarning("title", "")).toBeNull();
  });
  it("warns on a description under 70 or above 155", () => {
    expect(lengthWarning("description", text(69))).toBe("short");
    expect(lengthWarning("description", text(70))).toBeNull();
    expect(lengthWarning("description", text(155))).toBeNull();
    expect(lengthWarning("description", text(156))).toBe("long");
    expect(lengthWarning("description", "   ")).toBeNull();
  });
});

describe("Google-style preview", () => {
  it("cuts at a word boundary with an ellipsis, never mid-word", () => {
    expect(previewTrim("Buy gold bars and coins at today's price", 20)).toBe("Buy gold bars and…");
    expect(previewTrim("short", 20)).toBe("short");
  });
  it("folds line breaks and runs of spaces into one line", () => {
    expect(previewTrim("one\n\ntwo   three", 50)).toBe("one two three");
  });
  it("drops a trailing separator before the ellipsis", () => {
    expect(previewTrim("Gold price today | GoldGram extra words", 18)).toBe("Gold price today…");
  });
  it("fills the known template variables and leaves the rest", () => {
    expect(fillTemplate("{name} | {site} {price_buy}", { name: "10 g bar", site: "GoldGram" })).toBe("10 g bar | GoldGram {price_buy}");
  });
  it("names variables the storefront does not know", () => {
    expect(unknownVariables("{name} {weigth} {site}", TEMPLATE_VARIABLES)).toEqual(["{weigth}"]);
  });
});

describe("Show in sitemap is forced off (DSH-01)", () => {
  const own = ["https://goldgram.eg/gold-bars", "https://goldgram.eg/en/gold-bars"];
  it("for a noindex page", () => {
    expect(sitemapLock({ index: false, canonical: "" }, own, false)).toBe("noindex");
  });
  it("for a redirected page", () => {
    expect(sitemapLock({ index: true, canonical: "" }, own, true)).toBe("redirected");
  });
  it("for a page canonicalised elsewhere, not for its own URL", () => {
    expect(sitemapLock({ index: true, canonical: "https://goldgram.eg/shop" }, own, false)).toBe("canonical");
    expect(sitemapLock({ index: true, canonical: "https://goldgram.eg/gold-bars/" }, own, false)).toBeNull();
    expect(sitemapLock({ index: true, canonical: "" }, own, false)).toBeNull();
  });
});

describe("slug, URL, robots, head code and alt rules", () => {
  it("allows lowercase a-z, 0-9 and single inner hyphens only", () => {
    expect(slugProblem("gold-era-10g-bar-24k")).toBeNull();
    for (const bad of ["", "Gold", "gold_bar", "-gold", "gold-", "gold--bar", "سبيكة", "gold bar"]) expect(slugProblem(bad)).not.toBeNull();
  });
  it("accepts only an absolute http(s) canonical", () => {
    expect(urlProblem("")).toBeNull();
    expect(urlProblem("https://goldgram.eg/x")).toBeNull();
    expect(urlProblem("/gold-bars")).not.toBeNull();
    expect(urlProblem("javascript:alert(1)")).not.toBeNull();
  });
  it("refuses a robots.txt without a Sitemap line", () => {
    expect(robotsProblem(DEFAULT_ROBOTS)).toBeNull();
    expect(robotsProblem("User-agent: *\nDisallow: /api/\n")).not.toBeNull();
    expect(robotsProblem("User-agent: *\n# Sitemap: https://goldgram.eg/sitemap.xml")).not.toBeNull();
  });
  it("accepts head code only as JSON-LD", () => {
    expect(headCodeProblem("")).toBeNull();
    expect(headCodeProblem('{"@type":"Organization"}')).toBeNull();
    expect(headCodeProblem('<script type="application/ld+json">{"@type":"Thing"}</script>')).toBeNull();
    expect(headCodeProblem("<script>alert(1)</script>")).not.toBeNull();
    expect(headCodeProblem("42")).not.toBeNull();
  });
  it("needs alt text in both languages unless the image is decorative", () => {
    expect(altProblem({ en: "Front", ar: "الوجه", decorative: false })).toBeNull();
    expect(altProblem({ en: "Front", ar: " ", decorative: false })).not.toBeNull();
    expect(altProblem({ en: "", ar: "", decorative: true })).toBeNull();
  });
});

describe("redirect rules (DSH-12)", () => {
  const rule = (from: string, to: string, type: 301 | 302 | 410 = 301) => ({ from, to, type, note: "" });
  it("checks the paths of a rule", () => {
    expect(redirectProblem(rule("/old", "/new"))).toBeNull();
    expect(redirectProblem(rule("old", "/new"))).not.toBeNull();
    expect(redirectProblem(rule("/old", ""))).not.toBeNull();
    expect(redirectProblem(rule("/old", "", 410))).toBeNull();
    expect(redirectProblem(rule("/same", "https://goldgram.eg/same/"))).not.toBeNull();
  });
  it("finds a loop through other rules", () => {
    expect(redirectEffect(rule("/a", "/b"), [rule("/b", "/c"), rule("/c", "/a")])).toEqual({ kind: "loop", via: "/b" });
  });
  it("finds a chain when the target is itself redirected", () => {
    expect(redirectEffect(rule("/a", "/b"), [rule("/b", "/c")])).toEqual({ kind: "chain", via: "/c" });
    expect(redirectEffect(rule("/a", "/b"), [rule("/x", "/y")])).toBeNull();
    expect(redirectEffect(rule("/a", "", 410), [rule("/b", "/a")])).toBeNull();
  });
});

describe("entity paths and templates", () => {
  it("follows the URL map", () => {
    expect(publicPath("static", "home")).toBe("/");
    expect(publicPath("static", "policies-buyback")).toBe("/policies/buyback");
    expect(publicPath("weight", "10-gram")).toBe("/gold-bars/10-gram");
    expect(publicPath("product", "x")).toBe("/shop/x");
    expect(publicPath("guide", "y")).toBe("/guides/y");
  });
  it("picks the page-type template", () => {
    expect(pageTypeOf("static", "gold-price-today")).toBe("price");
    expect(pageTypeOf("static", "about")).toBe("static");
    expect(pageTypeOf("product", "x")).toBe("product");
  });
  it("defaults an unsaved entry to index, follow and in the sitemap", () => {
    const entry = entryOrDefault("product", "x", null);
    expect([entry.index, entry.follow, entry.inSitemap, entry.title.en, entry.faq]).toEqual([true, true, true, "", []]);
  });
});
