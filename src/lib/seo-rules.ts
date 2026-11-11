// The SEO panel's rules (seo-req.txt "Field specification", DSH-01/02/11/12, MED-01), kept free
// of React so Vitest proves each one.
import type { ImageAlt, Lang, PageType, RedirectInput, RedirectRule, SeoType } from "./seo-api";

/** The static pages and the categories that have an SEO entry, with their public paths (TEC-05). */
export const STATIC_PAGES: [key: string, name: string][] = [
  ["home", "Home"],
  ["gold-price-today", "Gold price today"],
  ["silver-price-today", "Silver price today"],
  ["shop", "Shop (all products)"],
  ["making-charges", "Making charges"],
  ["zakat-calculator", "Zakat calculator"],
  ["guides", "Guides"],
  ["faq", "FAQ"],
  ["app", "App page"],
  ["about", "About"],
  ["contact", "Contact"],
  ["policies-shipping", "Shipping policy"],
  ["policies-buyback", "Buyback policy"],
  ["terms", "Terms"],
  ["privacy", "Privacy"],
];
export const CATEGORY_PAGES: [key: string, name: string][] = [
  ["gold-bars", "Gold bars"],
  ["gold-coins", "Gold coins"],
  ["gold-bar-pendants", "Bars to wear"],
  ["silver", "Silver"],
];

/** The storefront path of an entity (the same for /en, under its prefix). */
export function publicPath(type: SeoType, key: string): string {
  switch (type) {
    case "static":
      if (key === "home") return "/";
      if (key.startsWith("policies-")) return `/policies/${key.slice("policies-".length)}`;
      return `/${key}`;
    case "category":
      return `/${key}`;
    case "weight":
      return `/gold-bars/${key}`;
    case "product":
      return `/shop/${key}`;
    case "brand":
      return `/brands/${key}`;
    case "guide":
      return `/guides/${key}`;
  }
}

/** Which DSH-02 template fills an entity's empty fields. */
export function pageTypeOf(type: SeoType, key: string): PageType {
  if (type !== "static") return type;
  if (key === "home" || key === "guides" || key === "faq") return key;
  if (key === "gold-price-today" || key === "silver-price-today") return "price";
  return "static";
}

/** Listing pages carry an intro text above the product grid (80-150 words). */
export const hasIntro = (type: SeoType, key: string) =>
  type === "category" || type === "weight" || type === "brand" || (type === "static" && (key === "shop" || key === "guides"));

// ---- counters (DSH-01 field table)

export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 70;
export const DESCRIPTION_MAX = 155;

/** "long" above 60 characters for a title; "short" under 70 or "long" above 155 for a description. Empty is not warned: the template fills it. */
export function lengthWarning(kind: "title" | "description", text: string): "short" | "long" | null {
  const length = text.trim().length;
  if (length === 0) return null;
  if (kind === "title") return length > TITLE_MAX ? "long" : null;
  if (length < DESCRIPTION_MIN) return "short";
  return length > DESCRIPTION_MAX ? "long" : null;
}

// ---- Google-style preview

/** One line, cut at a word boundary with an ellipsis when longer than `max`: never mid-word, never a line break. */
export function previewTrim(text: string, max: number): string {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max + 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : line.slice(0, max)).replace(/[\s,.;:|·-]+$/, "")}…`;
}

/** A template with the variables that are known filled in; unknown ones stay as written. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (values[name] !== undefined && values[name] !== "" ? values[name] : whole));
}

/** `{variables}` in a template that the storefront does not know. */
export function unknownVariables(template: string, known: string[]): string[] {
  return [...new Set(template.match(/\{[^{}]*\}/g) ?? [])].filter((variable) => !known.includes(variable));
}

// ---- switches

/**
 * Why "Show in sitemap" is forced off, or null when the editor may choose: a noindex page, a page
 * redirected elsewhere, or one whose canonical points at another URL never belongs in a sitemap.
 */
export function sitemapLock(entry: { index: boolean; canonical: string }, ownUrls: string[], redirected: boolean): "noindex" | "redirected" | "canonical" | null {
  if (!entry.index) return "noindex";
  if (redirected) return "redirected";
  const canonical = entry.canonical.trim().replace(/\/+$/, "");
  if (canonical && !ownUrls.some((url) => url.replace(/\/+$/, "") === canonical)) return "canonical";
  return null;
}

// ---- field checks: each returns a sentence for the editor, or null

/** Lowercase Latin a-z, 0-9 and single hyphens, not at either end. */
export function slugProblem(slug: string): string | null {
  if (slug === "") return "Give it a slug";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return "Use lowercase letters a-z, digits and single hyphens only";
  return null;
}

/** An optional absolute http(s) URL. */
export function urlProblem(url: string): string | null {
  if (url.trim() === "") return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? null : "Use a full address that starts with https://";
  } catch {
    return "Use a full address that starts with https://";
  }
}

/** robots.txt must keep a `Sitemap:` line with an absolute URL (DSH-11). */
export function robotsProblem(text: string): string | null {
  return /^\s*sitemap:\s*https?:\/\/\S+/im.test(text) ? null : "Keep a Sitemap: line with the full sitemap address";
}

/** The robots.txt of IDX-01, for "Reset to default". */
export const DEFAULT_ROBOTS = `User-agent: *
Disallow: /api/
Allow: /api/products/*/images/
Allow: /api/articles/*/images/

Sitemap: https://goldgram.eg/sitemap.xml
`;

/** A page's custom head code: empty, or JSON-LD that parses (bare JSON or inside one script tag). */
export function headCodeProblem(code: string): string | null {
  const text = code.trim();
  if (text === "") return null;
  const inner = text.match(/^<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*)<\/script>$/i)?.[1] ?? text;
  try {
    const parsed: unknown = JSON.parse(inner);
    return typeof parsed === "object" && parsed !== null ? null : "The head code must be a JSON-LD object";
  } catch {
    return "The head code is not valid JSON";
  }
}

/** MED-01: a meaningful image needs alt text in both languages; a decorative one needs none. */
export function altProblem(alt: Pick<ImageAlt, "ar" | "en" | "decorative">): string | null {
  if (alt.decorative) return null;
  if (!alt.en.trim() || !alt.ar.trim()) return "Write the alt text in both languages, or tick Decorative";
  return null;
}

// ---- redirects (DSH-12)

const bare = (url: string) => url.trim().replace(/^https?:\/\/[^/]+/i, "").replace(/\/+$/, "") || "/";

/** Why a rule cannot be saved as typed, or null. */
export function redirectProblem(rule: RedirectInput): string | null {
  if (!rule.from.startsWith("/")) return "The old path starts with /";
  if (rule.type === 410) return null;
  if (!rule.to.trim()) return "Give the new address";
  if (!rule.to.startsWith("/") && urlProblem(rule.to) !== null) return "The new address is a path that starts with / or a full https:// address";
  if (bare(rule.from) === bare(rule.to)) return "A page cannot redirect to itself";
  return null;
}

/**
 * What saving this rule does to the others: `loop` when following the targets leads back to its own
 * path (the server refuses it), `chain` when its target is itself redirected (the server points it at
 * the final URL instead). `others` are the saved rules other than the one being edited.
 */
export function redirectEffect(rule: RedirectInput, others: Pick<RedirectRule, "from" | "to" | "type">[]): { kind: "loop" | "chain"; via: string } | null {
  if (rule.type === 410) return null;
  const next = new Map(others.filter((other) => other.type !== 410).map((other) => [bare(other.from), bare(other.to)]));
  const start = bare(rule.from);
  let at = bare(rule.to);
  const first = next.get(at);
  for (let hops = 0; hops < 50 && at !== undefined; hops++) {
    if (at === start) return { kind: "loop", via: rule.to };
    at = next.get(at) as string;
  }
  return first !== undefined ? { kind: "chain", via: first } : null;
}

/** Health issues in the order the report lists them, with their wording. */
export const HEALTH_ISSUES: [issue: string, label: string][] = [
  ["missing_title", "Missing title"],
  ["duplicate_title", "Duplicate title"],
  ["missing_description", "Missing description"],
  ["duplicate_description", "Duplicate description"],
  ["missing_h1", "Missing H1"],
  ["image_no_alt", "Image without alt text"],
  ["noindex", "Noindex"],
];

export const LANG_NAME: Record<Lang, string> = { en: "English", ar: "Arabic" };
