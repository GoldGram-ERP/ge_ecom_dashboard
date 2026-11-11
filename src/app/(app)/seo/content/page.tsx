import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGetOrNull } from "@/lib/api-server";
import { type PageBody, PAGE_KEYS, SEO_API } from "@/lib/seo-api";
import { PageBodies } from "./page-bodies";

// PG-14/15/16: the text of the about, contact, app and policy pages.
export default async function SeoContentPage() {
  const pages = await Promise.all(PAGE_KEYS.map((key) => serverGetOrNull<PageBody>(SEO_API.page(key))));
  return (
    <>
      <Intro>
        <T>The text of the about, contact, app and policy pages. Contact details, store links and the map come from Site settings.</T>
      </Intro>
      <PageBodies pages={PAGE_KEYS.map((key, index) => pages[index] ?? { key, title: { en: "", ar: "" }, bodyHtml: { en: "", ar: "" }, updatedAt: "" })} />
    </>
  );
}
