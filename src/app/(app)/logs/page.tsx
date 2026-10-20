import { T } from "@/components/t";
import Link from "next/link";
import { LinkRow } from "@/components/link-row";
import { Pager } from "@/components/pager";
import { EmptyRow, Intro, Status, TableCard } from "@/components/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serverGet } from "@/lib/api-server";
import { formatDateTime } from "@/lib/format";
import { LOG_SOURCES } from "@/lib/labels";
import { buildHref, parsePage } from "@/lib/query";
import type { LogList } from "@/lib/types";

const TABLE =
  "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:text-xs [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

// The system log: what the shop records as it works (messages to customers, order steps, KYC
// decisions, published prices), newest first. Each line opens its own screen.
export default async function LogsPage(props: PageProps<"/logs">) {
  const page = parsePage((await props.searchParams).page);
  const data = await serverGet<LogList>(buildHref("/admin/logs", { page }));
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <Intro>
        <T>Everything the shop recorded, newest first: messages written to customers, each step of an
        order, KYC decisions and published prices. Open a line to read all of it.</T>
      </Intro>
      <TableCard>
        <Table className={TABLE}>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead scope="col"><T>Date</T></TableHead>
              <TableHead scope="col"><T>Type</T></TableHead>
              <TableHead scope="col"><T>What happened</T></TableHead>
              <TableHead scope="col"><T>By</T></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <EmptyRow colSpan={4}><T>Nothing recorded yet. A line appears when an order is placed or moved, a price is published, or a KYC decision is made.</T></EmptyRow>
            ) : (
              data.items.map((entry) => {
                const [label, tone] = LOG_SOURCES[entry.source] ?? [entry.source, "mute"];
                const href = `/logs/${entry.source}/${entry.id}`;
                return (
                  <LinkRow key={href} href={href}>
                    <TableCell className="text-muted-foreground"><T>{formatDateTime(entry.createdAt)}</T></TableCell>
                    <TableCell>
                      <Status tone={tone}>{label}</Status>
                    </TableCell>
                    <TableCell dir="auto" className="min-w-64 whitespace-normal">
                      <Link href={href} className="font-medium text-secondary-foreground hover:underline">
                        <T>{entry.summary}</T>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground"><T>{entry.actor}</T></TableCell>
                  </LinkRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Pager
          previous={page > 1 ? buildHref("/logs", { page: page - 1 }) : null}
          next={page < pages ? buildHref("/logs", { page: page + 1 }) : null}
          text={`Page ${data.page} of ${pages} · ${data.total} entries`}
        />
      </TableCard>
    </>
  );
}
