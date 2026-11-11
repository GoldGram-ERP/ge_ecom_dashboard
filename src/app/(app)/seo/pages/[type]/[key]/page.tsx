import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { T } from "@/components/t";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { ApiError } from "@/lib/api";
import { serverGet, serverGetOrNull } from "@/lib/api-server";
import {
  entryOrDefault,
  type HealthRow,
  listOf,
  type RedirectRule,
  SEO_API,
  SEO_TYPES,
  type SeoChange,
  type SeoEntry,
  type SiteSeo,
  type Templates,
} from "@/lib/seo-api";
import { hasIntro, pageTypeOf, publicPath } from "@/lib/seo-rules";
import { seoEntities } from "../../../entities";
import { EntryScreen } from "./entry-screen";

/** The storefront's public address, for the canonical and the preview. */
const SITE_URL = (process.env.PUBLIC_SITE_URL ?? "https://goldgram.eg").replace(/\/+$/, "");

/** A read the screen can do without: null when the backend refuses or lacks it. */
async function optional<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

// DSH-01: one page's SEO fields, its Google-style preview, its history and (for a product) its image alt texts.
export default async function SeoEntryPage(props: PageProps<"/seo/pages/[type]/[key]">) {
  const params = await props.params;
  const type = SEO_TYPES.find((t) => t === params.type);
  const key = decodeURIComponent(params.key);
  const entity = type ? (await seoEntities(type)).find((item) => item.key === key) : undefined;

  const back = (
    <Button variant="outline" className="w-fit" asChild>
      <Link href={`/seo/pages?type=${type ?? "static"}`}>
        <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
        <T>Back to pages</T>
      </Link>
    </Button>
  );
  if (!type || !entity) {
    return (
      <>
        {back}
        <p className="text-sm text-muted-foreground"><T>There is no page at this address. Open one from the list.</T></p>
      </>
    );
  }

  const path = publicPath(type, key);
  const [saved, history, templates, site, redirects, health] = await Promise.all([
    serverGetOrNull<Partial<SeoEntry>>(SEO_API.entry(type, key)),
    optional(serverGet<SeoChange[] | { items: SeoChange[] }>(SEO_API.history(type, key)).then(listOf)),
    optional(serverGet<Templates>(SEO_API.templates)),
    optional(serverGet<SiteSeo>(SEO_API.site)),
    optional(serverGet<RedirectRule[] | { items: RedirectRule[] }>(SEO_API.redirects).then(listOf)),
    optional(serverGet<HealthRow[] | { items: HealthRow[] }>(SEO_API.health).then(listOf)),
  ]);
  const enPath = path === "/" ? "/en" : `/en${path}`;
  const issues = (health ?? []).filter((row) => row.type === type && row.key === key);

  return (
    <>
      {back}
      <EntryScreen
        type={type}
        entityKey={key}
        name={{ en: entity.nameEn, ar: entity.nameAr }}
        fixedName={type === "static" || type === "category"}
        entry={entryOrDefault(type, key, saved)}
        history={history ?? []}
        template={templates?.[pageTypeOf(type, key)] ?? null}
        siteName={site?.business.siteName ?? { en: "GoldGram", ar: "جولدجرام" }}
        siteUrl={SITE_URL}
        path={path}
        redirected={(redirects ?? []).some((rule) => rule.from === path || rule.from === enPath)}
        duplicates={issues.filter((row) => row.issue === "duplicate_title" || row.issue === "duplicate_description")}
        intro={hasIntro(type, key)}
        product={entity.product ?? null}
      />
    </>
  );
}
