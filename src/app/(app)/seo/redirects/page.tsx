import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import { listOf, type RedirectRule, SEO_API } from "@/lib/seo-api";
import { Redirects } from "./redirects";

// DSH-12: redirects for addresses that change after launch.
export default async function SeoRedirectsPage() {
  const rules = listOf(await serverGet<RedirectRule[] | { items: RedirectRule[] }>(SEO_API.redirects));
  return (
    <>
      <Intro>
        <T>Send an old address to its new one (301 for a move, 302 for a short while) or answer 410 for a page that is gone. A slug change makes its 301 by itself.</T>
      </Intro>
      <Redirects rules={rules} />
    </>
  );
}
