import { emptyL, type HomeSection, type L, type Layout, type MenuColumn, type MenuGroup, type MenuLink, type TargetPage } from "./seo-api";

// The pure rules of the "Home and menus" screen: reordering, limits, what is sent, field names.

export const POPULAR_MAX = 8;
export const HEADER_MAX = 6;
export const CHILDREN_MAX = 12;
export const COLUMNS_MAX = 3;
export const COLUMN_LINKS_MAX = 12;

/** The human name of each home section, English then Arabic. */
export const SECTION_NAMES: Record<HomeSection, [en: string, ar: string]> = {
  hero: ["Hero banner", "الواجهة الرئيسية"],
  prices: ["Live gold prices", "أسعار الذهب الآن"],
  weights: ["Shop by weight", "التسوق حسب الوزن"],
  forms: ["Shop by form", "التسوق حسب النوع"],
  popular: ["Popular products", "الأكثر طلبًا"],
  why: ["Why GoldGram", "لماذا جولد جرام"],
  brands: ["Brands", "العلامات التجارية"],
  compare: ["Brand comparison", "مقارنة العلامات"],
  how: ["How to buy", "كيف تشتري"],
  proofs: ["Proofs and certificates", "الإثباتات والشهادات"],
  app: ["App download", "تحميل التطبيق"],
  faq: ["Common questions", "الأسئلة الشائعة"],
  about: ["About us", "من نحن"],
  contact: ["Contact", "تواصل معنا"],
  articles: ["Latest articles", "أحدث المقالات"],
  promise: ["Our promise", "وعدنا"],
  record: ["Business record", "السجل التجاري"],
};

/** A list with the item at `from` moved by `by` places. Out of range, or onto `lock` places at the start: unchanged. */
export function moveItem<T>(list: readonly T[], from: number, by: -1 | 1, lock = 0): T[] {
  const to = from + by;
  if (from < lock || to < lock || to < 0 || to >= list.length) return [...list];
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** The sections with `section` shown or hidden. The hero cannot be hidden. */
export function toggleSection(hidden: readonly HomeSection[], section: HomeSection): HomeSection[] {
  if (section === "hero") return [...hidden];
  return hidden.includes(section) ? hidden.filter((s) => s !== section) : [...hidden, section];
}

/** The picked products with `id` added at the end, unless it is picked or the list is full. */
export function addPopular(ids: readonly number[], id: number): number[] {
  return ids.includes(id) || ids.length >= POPULAR_MAX ? [...ids] : [...ids, id];
}

export const blankLink = (): MenuLink => ({ label: emptyL(), target: "", url: "", kind: "page" });
export const blankGroup = (): MenuGroup => ({ ...blankLink(), children: [] });
export const blankColumn = (): MenuColumn => ({ title: emptyL(), links: [] });

export const kindOf = (link: MenuLink): "page" | "address" => link.kind ?? (link.url ? "address" : "page");

/** A link switched between a page and an address: the other one's value is cleared, so it never holds both. */
export const withKind = <T extends MenuLink>(link: T, kind: "page" | "address"): T => ({ ...link, kind, target: kind === "page" ? link.target : "", url: kind === "address" ? link.url : "" });

const plainLink = (link: MenuLink): MenuLink => ({ label: { ar: link.label.ar.trim(), en: link.label.en.trim() }, target: link.target, url: link.url.trim() });

/** The layout as `PUT /admin/seo/layout` takes it: only what the API knows, texts trimmed. */
export function toPayload(layout: Layout): Layout {
  return {
    home: { order: [...layout.home.order], hidden: [...layout.home.hidden], popularIds: [...layout.home.popularIds] },
    menus: {
      header: layout.menus.header.map((group) => ({ ...plainLink(group), children: group.children.map(plainLink) })),
      footer: layout.menus.footer.map((column) => ({ title: { ar: column.title.ar.trim(), en: column.title.en.trim() }, links: column.links.map(plainLink) })),
    },
  };
}

/** The pages a picker offers for a search word: grouped by type (type order, then name), the chosen one always kept. */
export function pageChoices(pages: readonly TargetPage[], search: string, chosen: string, typeOrder: readonly string[]): TargetPage[] {
  const word = search.trim().toLowerCase();
  const matches = (page: TargetPage) => !word || [page.name.en, page.name.ar, page.path].some((text) => text.toLowerCase().includes(word));
  const rank = (page: TargetPage) => typeOrder.indexOf(page.type);
  return pages
    .filter((page) => page.target === chosen || matches(page))
    .sort((a, b) => rank(a) - rank(b) || (a.name.en || a.name.ar).localeCompare(b.name.en || b.name.ar));
}

/**
 * The names staff see for the API's field paths, for a refused save: `menus.header[1].children[0].url`
 * becomes "Header menu, entry 2, link 1 › address" (no colon: the error sentence is split at one). `t` translates each piece.
 */
export function layoutLabels(layout: Layout, t: (text: string) => string): Record<string, string> {
  const labels: Record<string, string> = {
    "home.order": t("Section order"),
    "home.hidden": t("Hidden sections"),
    "home.popularIds": t("Popular products"),
    "menus.header": t("Header menu"),
    "menus.footer": t("Footer menu"),
    body: t("Home and menus"),
  };
  const link = (at: string, name: string) => {
    labels[at] = name;
    labels[`${at}.target`] = `${name} › ${t("page")}`;
    labels[`${at}.url`] = `${name} › ${t("address")}`;
    labels[`${at}.label`] = `${name} › ${t("labels")}`;
    labels[`${at}.label.ar`] = `${name} › ${t("Arabic label")}`;
    labels[`${at}.label.en`] = `${name} › ${t("English label")}`;
  };
  layout.menus.header.forEach((group, i) => {
    const entry = `${t("Header menu")}, ${t("entry")} ${i + 1}`;
    link(`menus.header[${i}]`, entry);
    labels[`menus.header[${i}].children`] = `${entry} › ${t("dropdown links")}`;
    group.children.forEach((_, j) => link(`menus.header[${i}].children[${j}]`, `${entry}, ${t("link")} ${j + 1}`));
  });
  layout.menus.footer.forEach((column, i) => {
    const name = `${t("Footer menu")}, ${t("column")} ${i + 1}`;
    labels[`menus.footer[${i}]`] = name;
    labels[`menus.footer[${i}].title`] = `${name} › ${t("title")}`;
    labels[`menus.footer[${i}].title.ar`] = `${name} › ${t("Arabic title")}`;
    labels[`menus.footer[${i}].title.en`] = `${name} › ${t("English title")}`;
    labels[`menus.footer[${i}].links`] = `${name} › ${t("links")}`;
    column.links.forEach((_, j) => link(`menus.footer[${i}].links[${j}]`, `${name}, ${t("link")} ${j + 1}`));
  });
  return labels;
}

/** Text of a bilingual value for the dashboard's language. */
export const pick = (value: L, arabic: boolean) => (arabic ? value.ar || value.en : value.en || value.ar);
