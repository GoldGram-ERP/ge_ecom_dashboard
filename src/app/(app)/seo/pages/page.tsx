import Link from "next/link";
import { T } from "@/components/t";
import { LinkRow } from "@/components/link-row";
import { EmptyRow, Intro, LinkTabs, Note, Status, TableCard } from "@/components/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { isArabic, serverGet } from "@/lib/api-server";
import { formatStamp } from "@/lib/format";
import { firstParam } from "@/lib/query";
import { listOf, SEO_API, SEO_TYPES, seoEditPath, type SeoEntrySummary, type SeoType } from "@/lib/seo-api";
import { publicPath } from "@/lib/seo-rules";
import { seoEntities } from "../entities";

const TABS: [SeoType, string][] = [
  ["static", "Static pages"],
  ["category", "Categories"],
  ["weight", "Weights"],
  ["product", "Products"],
  ["brand", "Brands"],
  ["guide", "Guides"],
];

// DSH-01: every indexable page, by type. A row opens that page's SEO screen; nothing changes here.
export default async function SeoPagesPage(props: PageProps<"/seo/pages">) {
  const wanted = firstParam((await props.searchParams).type);
  const type: SeoType = SEO_TYPES.find((t) => t === wanted) ?? "static";
  const ar = await isArabic();
  const [entities, saved] = await Promise.all([
    seoEntities(type),
    serverGet<SeoEntrySummary[] | { items: SeoEntrySummary[] }>(SEO_API.summaries(type)).then(listOf, (error: unknown) => {
      if (error instanceof ApiError) return [] as SeoEntrySummary[];
      throw error;
    }),
  ]);
  const byKey = new Map(saved.map((entry) => [entry.key, entry]));
  const fixedNames = type === "static" || type === "category";

  return (
    <>
      <Intro>
        <T>Every page the website can show in search, with its own title, description and indexing. A page with nothing saved uses its SEO template.</T>
      </Intro>
      <LinkTabs current={type} items={TABS.map(([key, label]) => ({ key, label, href: `/seo/pages?type=${key}` }))} />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Page</T></TableHead>
              <TableHead scope="col"><T>Address</T></TableHead>
              <TableHead scope="col"><T>Indexing</T></TableHead>
              <TableHead scope="col"><T>Sitemap</T></TableHead>
              <TableHead scope="col"><T>Updated</T></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.length === 0 ? (
              <EmptyRow colSpan={5}>No pages of this type yet.</EmptyRow>
            ) : (
              entities.map((entity) => {
                const entry = byKey.get(entity.key);
                const href = seoEditPath(type, entity.key);
                const name = fixedNames ? <T>{entity.nameEn}</T> : (ar && entity.nameAr) || entity.nameEn;
                return (
                  <LinkRow key={entity.key} href={href}>
                    <TableCell className="whitespace-normal">
                      <Link href={href} className="font-medium hover:underline">{name}</Link>
                      {!fixedNames && entity.nameAr ? <Note dir="auto">{ar ? entity.nameEn : entity.nameAr}</Note> : null}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start text-muted-foreground">{publicPath(type, entity.key)}</TableCell>
                    <TableCell>
                      {entry ? <Status tone={entry.index ? "ok" : "warn"}>{entry.index ? "Index" : "Noindex"}</Status> : <Status tone="mute">Template</Status>}
                    </TableCell>
                    <TableCell>
                      <Status tone={entry && !entry.inSitemap ? "mute" : "info"}>{entry && !entry.inSitemap ? "Left out" : "Listed"}</Status>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry?.updatedAt ? <T>{formatStamp(entry.updatedAt)}</T> : "—"}</TableCell>
                  </LinkRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableCard>
    </>
  );
}
