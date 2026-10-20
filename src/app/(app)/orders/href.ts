import { buildHref } from "@/lib/query";

/** What the file keeps in S.tab, S.q, S.dl, S.from, S.to and S.rp; here it is the URL query. */
export interface OrderQuery {
  tab: string;
  q: string;
  delivery: string;
  from: string;
  to: string;
  pageSize: number;
}

/** The orders URL for a set of filters. Page 1 and the defaults are left out. */
export function ordersHref(query: OrderQuery, page = 1): string {
  return buildHref("/orders", {
    tab: query.tab === "all" ? "" : query.tab,
    q: query.q,
    delivery: query.delivery,
    from: query.from,
    to: query.to,
    pageSize: query.pageSize === 10 ? "" : query.pageSize,
    page,
  });
}
