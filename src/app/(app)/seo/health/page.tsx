import Link from "next/link";
import { T } from "@/components/t";
import { LinkRow } from "@/components/link-row";
import { EmptyRow, Intro, LinkTabs, Status, TableCard } from "@/components/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serverGet } from "@/lib/api-server";
import { firstParam } from "@/lib/query";
import { type HealthRow, listOf, SEO_API, seoEditPath } from "@/lib/seo-api";
import { HEALTH_ISSUES, LANG_NAME } from "@/lib/seo-rules";

// DSH-03: the indexable pages with a problem. Each row opens that page's SEO screen.
export default async function SeoHealthPage(props: PageProps<"/seo/health">) {
  const rows = listOf(await serverGet<HealthRow[] | { items: HealthRow[] }>(SEO_API.health));
  const wanted = firstParam((await props.searchParams).issue);
  const issue = HEALTH_ISSUES.some(([key]) => key === wanted) ? wanted : "";
  const shown = issue ? rows.filter((row) => row.issue === issue) : rows;
  const count = (key: string) => rows.filter((row) => row.issue === key).length;
  const label = (key: string) => HEALTH_ISSUES.find(([k]) => k === key)?.[1] ?? key;

  return (
    <>
      <Intro>
        <T>The problems a search engine would find on the indexable pages: missing or repeated titles and descriptions, a missing H1, photos without alt text and pages left out of search.</T>
      </Intro>
      <LinkTabs
        current={issue || "all"}
        items={[
          { key: "all", label: <><T>All</T> ({rows.length})</>, href: "/seo/health" },
          ...HEALTH_ISSUES.map(([key, text]) => ({ key, label: <><T>{text}</T> ({count(key)})</>, href: `/seo/health?issue=${key}` })),
        ]}
      />
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col"><T>Page</T></TableHead>
              <TableHead scope="col"><T>Problem</T></TableHead>
              <TableHead scope="col"><T>Language</T></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <EmptyRow colSpan={3}>No problems found.</EmptyRow>
            ) : (
              shown.map((row, index) => {
                const href = row.link || seoEditPath(row.type, row.key);
                return (
                  <LinkRow key={`${row.type}-${row.key}-${row.issue}-${row.lang ?? ""}-${index}`} href={href}>
                    <TableCell dir="ltr" className="text-start">
                      <Link href={href} className="font-medium hover:underline">{row.path}</Link>
                    </TableCell>
                    <TableCell><Status tone={row.issue === "noindex" ? "mute" : "warn"}>{label(row.issue)}</Status></TableCell>
                    <TableCell>{row.lang ? <T>{LANG_NAME[row.lang]}</T> : <T>Both</T>}</TableCell>
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
