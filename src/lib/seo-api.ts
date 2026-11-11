// The SEO panel's whole contract with the backend (SEO-BUILD-BRIEF "Shared API contract"), in one
// file: every type and every path the SEO screens use. A contract tweak is a change here only.

/** A value per language. */
export interface L {
  ar: string;
  en: string;
}
export type Lang = keyof L;
export const LANGS: Lang[] = ["en", "ar"];
export const emptyL = (): L => ({ ar: "", en: "" });

export type SeoType = "static" | "category" | "weight" | "product" | "brand" | "guide";
export const SEO_TYPES: SeoType[] = ["static", "category", "weight", "product", "brand", "guide"];

export interface FaqPair {
  q: L;
  a: L;
}

/** `GET|PUT /admin/seo/entries/:type/:key`. Empty strings, never null. */
export interface SeoEntry {
  type: SeoType;
  key: string;
  title: L;
  description: L;
  h1: L;
  canonical: string;
  index: boolean;
  follow: boolean;
  inSitemap: boolean;
  ogTitle: L;
  ogDescription: L;
  ogImageUrl: string;
  breadcrumbLabel: L;
  introHtml: L;
  faq: FaqPair[];
  /** SUPER_ADMIN only, JSON-LD checked on save. */
  headCode: string;
  focusKeyword: string;
  updatedAt: string;
}

/** `GET /seo/entries?type=`: what is saved, for the list's status column. */
export interface SeoEntrySummary {
  type: SeoType;
  key: string;
  index: boolean;
  inSitemap: boolean;
  updatedAt: string;
}

/** `GET /admin/seo/entries/:type/:key/history`: one changed field. */
export interface SeoChange {
  who: string;
  when: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export type PageType = "home" | "static" | "category" | "weight" | "product" | "brand" | "guide" | "guides" | "price" | "faq";
export const PAGE_TYPES: PageType[] = ["home", "static", "category", "weight", "product", "brand", "guide", "guides", "price", "faq"];
export type Templates = Record<PageType, Record<Lang, { title: string; description: string }>>;
export const TEMPLATE_VARIABLES = ["{name}", "{weight}", "{brand}", "{karat}", "{price_buy}", "{price_sell}", "{making_per_gram}", "{date}", "{year}", "{site}"];

/** `GET|PUT /admin/seo/site`. */
export interface SiteSeo {
  business: {
    siteName: L;
    legalName: L;
    logoUrl: string;
    logoPngUrl: string;
    defaultOgImageUrl: string;
    hotline: string;
    whatsapp: string;
    email: string;
    address: L;
    mapLat: string;
    mapLng: string;
    mapUrl: string;
    openingHours: L;
    commercialRegister: string;
    taxRegistration: string;
    hallmarking: string;
    socialUrls: { instagram: string; facebook: string; tiktok: string; x: string; youtube: string; linkedin: string };
    appStoreUrl: string;
    googlePlayUrl: string;
  };
  titleSeparator: string;
  brandSuffix: L;
  robotsTxt: string;
  verification: { google: string; bing: string; meta: string };
  gtmId: string;
  /** SUPER_ADMIN only. */
  headCode: string;
  bodyStartCode: string;
  bodyEndCode: string;
}
export const SITE_CODE_FIELDS = ["headCode", "bodyStartCode", "bodyEndCode"] as const;

export type RedirectType = 301 | 302 | 410;
export interface RedirectRule {
  id: number;
  from: string;
  to: string;
  type: RedirectType;
  note: string;
  createdBy: string;
  createdAt: string;
  hits: number;
  lastHitAt: string | null;
}
export type RedirectInput = Pick<RedirectRule, "from" | "to" | "type" | "note">;

/** `GET /admin/seo/health`: one problem of one indexable page. */
export type HealthIssue =
  | "missing_title"
  | "duplicate_title"
  | "missing_description"
  | "duplicate_description"
  | "missing_h1"
  | "image_no_alt"
  | "noindex";
export interface HealthRow {
  type: SeoType;
  key: string;
  /** The page's public path, e.g. `/gold-bars/10-gram`. */
  path: string;
  issue: HealthIssue;
  /** Empty when the problem is the same in both languages. */
  lang?: Lang | "";
  /** The dashboard path of the edit screen; `seoEditPath(type, key)` when missing. */
  link?: string;
}

/** `GET|PUT /admin/pages/:key`: an editable page body. */
export const PAGE_KEYS = ["about", "contact", "app", "policies-shipping", "policies-buyback"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
export interface PageBody {
  key: PageKey;
  title: L;
  bodyHtml: L;
  updatedAt: string;
}

/** `GET /catalog/weights`. */
export interface Weight {
  slug: string;
  grams: number;
  label: L;
  productCount: number;
}

/** The fields of public `GET /products` the SEO screens read (slug, names, photos and their alt texts). */
export interface PublicProduct {
  id: number;
  slug: string;
  category: string;
  nameEn: string;
  nameAr: string;
  weightGrams: number;
  karat: number;
  manufacturerEn: string;
  manufacturerAr: string;
  manufacturerSlug: string;
  imageIds: number[];
  imageAlts?: ImageAlt[];
}
export interface ImageAlt {
  id: number;
  ar: string;
  en: string;
  decorative: boolean;
}

/** Every path, so a renamed route is one line. */
export const SEO_API = {
  entry: (type: SeoType, key: string) => `/admin/seo/entries/${type}/${encodeURIComponent(key)}`,
  history: (type: SeoType, key: string) => `/admin/seo/entries/${type}/${encodeURIComponent(key)}/history`,
  summaries: (type: SeoType) => `/seo/entries?type=${type}`,
  templates: "/admin/seo/templates",
  site: "/admin/seo/site",
  redirects: "/admin/seo/redirects",
  redirect: (id: number) => `/admin/seo/redirects/${id}`,
  redirectsCsv: "/admin/seo/redirects/export.csv",
  redirectsImport: "/admin/seo/redirects/import",
  health: "/admin/seo/health",
  page: (key: PageKey) => `/admin/pages/${key}`,
  weights: "/catalog/weights",
  products: "/products",
  imageAlt: (productId: number, imageId: number) => `/admin/catalog/products/${productId}/images/${imageId}`,
};

/** The dashboard's edit screen of one page's SEO. */
export const seoEditPath = (type: SeoType, key: string) => `/seo/pages/${type}/${encodeURIComponent(key)}`;

/** A list the backend may send bare or as `{ items }`. */
export const listOf = <T,>(body: T[] | { items: T[] } | null | undefined): T[] => (Array.isArray(body) ? body : (body?.items ?? []));

/** What the backend sends for one history line (`adminName`, `createdAt`). */
interface ApiChange {
  field: string;
  oldValue: string;
  newValue: string;
  adminName?: string;
  createdAt?: string;
  who?: string;
  when?: string;
}

/** History lines in the dashboard's shape. */
export function historyOf(body: ApiChange[] | { items: ApiChange[] } | null | undefined): SeoChange[] {
  return listOf(body).map((row) => ({
    who: row.who ?? row.adminName ?? "",
    when: row.when ?? row.createdAt ?? "",
    field: row.field,
    oldValue: row.oldValue,
    newValue: row.newValue,
  }));
}

/** What the backend sends: one row per page, with its problems (`title_missing`, …). */
interface ApiHealthPage {
  type: SeoType;
  key: string;
  path: string;
  editPath?: string;
  issues: { code: string; lang: Lang | null }[];
}

const HEALTH_CODES: Record<string, HealthIssue> = {
  title_missing: "missing_title",
  title_duplicate: "duplicate_title",
  description_missing: "missing_description",
  description_duplicate: "duplicate_description",
  h1_missing: "missing_h1",
  image_alt_missing: "image_no_alt",
  noindex: "noindex",
};

/** Health rows in the dashboard's shape: one row per problem. Rows already in that shape pass through. */
export function healthOf(body: (ApiHealthPage | HealthRow)[] | { items: (ApiHealthPage | HealthRow)[] } | null | undefined): HealthRow[] {
  return listOf(body).flatMap((row) => {
    if (!("issues" in row)) return [row];
    return row.issues.flatMap((problem) => {
      const issue = HEALTH_CODES[problem.code];
      return issue ? [{ type: row.type, key: row.key, path: row.path, issue, lang: problem.lang ?? "" }] : [];
    });
  });
}

/** A saved entry, or the defaults the storefront uses when nothing is saved. */
export function entryOrDefault(type: SeoType, key: string, saved: Partial<SeoEntry> | null): SeoEntry {
  const l = (value?: Partial<L>): L => ({ ar: value?.ar ?? "", en: value?.en ?? "" });
  return {
    type,
    key,
    title: l(saved?.title),
    description: l(saved?.description),
    h1: l(saved?.h1),
    canonical: saved?.canonical ?? "",
    index: saved?.index ?? true,
    follow: saved?.follow ?? true,
    inSitemap: saved?.inSitemap ?? true,
    ogTitle: l(saved?.ogTitle),
    ogDescription: l(saved?.ogDescription),
    ogImageUrl: saved?.ogImageUrl ?? "",
    breadcrumbLabel: l(saved?.breadcrumbLabel),
    introHtml: l(saved?.introHtml),
    faq: (saved?.faq ?? []).map((pair) => ({ q: l(pair.q), a: l(pair.a) })),
    headCode: saved?.headCode ?? "",
    focusKeyword: saved?.focusKeyword ?? "",
    updatedAt: saved?.updatedAt ?? "",
  };
}
