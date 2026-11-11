// Server Components only: the indexable entities of each SEO type, from the catalog the storefront
// itself reads (public product, weight and article data), so the keys are the storefront's slugs.
import { ApiError } from "@/lib/api";
import { serverGet } from "@/lib/api-server";
import type { AdminArticle } from "@/lib/types";
import { listOf, type PublicProduct, SEO_API, type SeoType, type Weight } from "@/lib/seo-api";
import { CATEGORY_PAGES, STATIC_PAGES } from "@/lib/seo-rules";

export interface SeoEntity {
  key: string;
  nameEn: string;
  nameAr: string;
  /** For a product: what the image alt editor needs. */
  product?: PublicProduct;
}

/** A list the backend may not serve yet (or this role may not read): empty instead of an error page. */
async function optionalList<T>(path: string): Promise<T[]> {
  try {
    return listOf(await serverGet<T[] | { items: T[] }>(path));
  } catch (error) {
    if (error instanceof ApiError) return [];
    throw error; // the redirect to /login
  }
}

export async function seoEntities(type: SeoType): Promise<SeoEntity[]> {
  switch (type) {
    case "static":
      return STATIC_PAGES.map(([key, name]) => ({ key, nameEn: name, nameAr: "" }));
    case "category":
      return CATEGORY_PAGES.map(([key, name]) => ({ key, nameEn: name, nameAr: "" }));
    case "weight":
      return (await optionalList<Weight>(SEO_API.weights)).map((w) => ({ key: w.slug, nameEn: w.label.en, nameAr: w.label.ar }));
    case "product":
      return (await optionalList<PublicProduct>(SEO_API.products)).map((p) => ({
        key: p.slug,
        nameEn: `${p.nameEn} ${p.weightGrams} g`,
        nameAr: p.nameAr ? `${p.nameAr} ${p.weightGrams} جم` : "",
        product: p,
      }));
    case "brand": {
      const brands = new Map<string, SeoEntity>();
      for (const p of await optionalList<PublicProduct>(SEO_API.products))
        if (p.manufacturerSlug) brands.set(p.manufacturerSlug, { key: p.manufacturerSlug, nameEn: p.manufacturerEn, nameAr: p.manufacturerAr });
      return [...brands.values()];
    }
    case "guide":
      return (await optionalList<AdminArticle>("/admin/articles"))
        .filter((article) => article.published && article.slug)
        .map((article) => ({ key: article.slug as string, nameEn: article.titleEn, nameAr: article.titleAr }));
  }
}
