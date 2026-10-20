import { buildHref } from "@/lib/query";

/** The customer list's filters, all kept in the URL so a view can be bookmarked and reloaded. */
export interface CustomerQuery {
  /** The count card, and the filters panel's "Status": ACTIVE, INACTIVE, SUSPENDED or "". */
  account: string;
  /** "pending" on the "Pending approval" tab. */
  kyc: string;
  name: string;
  email: string;
  phone: string;
  /** The filters panel's "Document status". */
  doc: string;
  pageSize: number;
}

export const DOCUMENT_STATUSES = ["Approved", "Pending approval", "Documents required"];

/** The same filters as the dashboard's URL, in the names the API uses. */
export function customersApiQuery(query: CustomerQuery, page: number, pageSize = query.pageSize) {
  return {
    account: query.account,
    kyc: query.kyc,
    name: query.name,
    email: query.email,
    phone: query.phone,
    kycStatus: query.doc,
    pageSize,
    page,
  };
}

/** The customers URL for a set of filters. Page 1 and the defaults are left out. */
export function customersHref(query: CustomerQuery, page = 1): string {
  return buildHref("/customers", {
    account: query.account,
    kyc: query.kyc,
    name: query.name,
    email: query.email,
    phone: query.phone,
    doc: query.doc,
    pageSize: query.pageSize === 10 ? "" : query.pageSize,
    page,
  });
}
