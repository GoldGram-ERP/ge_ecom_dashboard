import { T } from "@/components/t";
import Link from "next/link";
import { LinkRow } from "@/components/link-row";
import { Pager } from "@/components/pager";
import { EmptyRow, Intro, LinkTabs, Note, Status, TableCard } from "@/components/parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { serverGet } from "@/lib/api-server";
import { formatNumber, formatStamp } from "@/lib/format";
import { formatEgp } from "@/lib/money";
import { buildHref, firstParam, parsePage } from "@/lib/query";
import type { SellRequestList } from "@/lib/types";
import { SELL_HANDOVER, SELL_KIND, SELL_PAYOUT, SELL_STATUS } from "./labels";

const TABS = [
  ["", "All"],
  ["new", "New"],
  ["contacted", "Contacted"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;
const TABLE =
  "[&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:text-xs [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase";

// Requests to sell gold to GoldGram, from the storefront's sell page. Newest first.
export default async function SellRequestsPage(props: PageProps<"/sell-requests">) {
  const raw = await props.searchParams;
  const wanted = firstParam(raw.status);
  const status = TABS.some(([key]) => key === wanted) ? wanted : "";
  const page = parsePage(raw.page);
  const data = await serverGet<SellRequestList>(buildHref("/admin/sell-requests", { status, page, pageSize: 20 }));
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const here = (s: string, p = 1) => buildHref("/sell-requests", { status: s, page: p });

  return (
    <>
      <Intro>
        <T>The estimate is what we pay: for a brand we sell with a cashback policy, its refund per piece × quantity; otherwise the weight × quantity × our per-gram sell price when the request came in. Staff set the final price after inspecting the piece.</T>
      </Intro>
      <LinkTabs current={status || "all"} items={TABS.map(([key, label]) => ({ key: key || "all", label, href: here(key) }))} />
      <TableCard>
        <Table className={TABLE}>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead scope="col"><T>Request</T></TableHead>
              <TableHead scope="col"><T>Customer</T></TableHead>
              <TableHead scope="col"><T>Piece</T></TableHead>
              <TableHead scope="col" className="text-end"><T>Estimate (EGP)</T></TableHead>
              <TableHead scope="col"><T>Hand-over</T></TableHead>
              <TableHead scope="col"><T>Status</T></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <EmptyRow colSpan={6}><T>No sell requests here yet.</T></EmptyRow>
            ) : (
              data.items.map((item) => (
                <LinkRow key={item.id} href={`/sell-requests/${item.id}`}>
                  <TableCell>
                    <Link href={`/sell-requests/${item.id}`} className="num font-medium text-secondary-foreground hover:underline">
                      {item.reference}
                    </Link>
                    <Note><T>{formatStamp(item.createdAt)}</T></Note>
                  </TableCell>
                  <TableCell>
                    <span dir="auto">{item.name}</span>
                    <Note className="num">{item.mobile}</Note>
                  </TableCell>
                  <TableCell>
                    <T>{SELL_KIND[item.kind]}</T> <span className="num">{item.karat}K</span>
                    <Note className="num" dir="ltr">
                      {formatNumber(item.weightGrams)} g × {item.qty}
                    </Note>
                  </TableCell>
                  <TableCell className="num text-end">{formatEgp(item.estimatePiastres)}</TableCell>
                  <TableCell>
                    <T>{SELL_HANDOVER[item.handover]}</T>
                    <Note>{SELL_PAYOUT[item.payout]}</Note>
                  </TableCell>
                  <TableCell>
                    <Status tone={SELL_STATUS[item.status][1]}>{SELL_STATUS[item.status][0]}</Status>
                  </TableCell>
                </LinkRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pager
          previous={page > 1 ? here(status, page - 1) : null}
          next={page < pages ? here(status, page + 1) : null}
          text={`Page ${data.page} of ${pages} · ${data.total} requests`}
        />
      </TableCard>
    </>
  );
}
