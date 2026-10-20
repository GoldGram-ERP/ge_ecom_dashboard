// List pages keep filter, search and page in the URL query so a view can be bookmarked.

export type RawParam = string | string[] | undefined;

/** `?a=1&a=2` gives an array; the first value is the one that counts. */
export function firstParam(value: RawParam): string {
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? "").trim();
}

/** A page number from the URL: a positive whole number, otherwise page 1. */
export function parsePage(value: RawParam): number {
  const text = firstParam(value);
  if (!/^[1-9]\d{0,6}$/.test(text)) return 1;
  return Number(text);
}

/** Builds `/orders?status=paid&page=2`, leaving out empty values and `page=1`. */
export function buildHref(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text === "" ? path : `${path}?${text}`;
}
