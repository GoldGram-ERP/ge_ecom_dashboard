import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import { SEO_API, type SiteSeo } from "@/lib/seo-api";
import { SiteSettings } from "./site-settings";

// DSH-10, DSH-11, DSH-13: the values every page of the website shares.
export default async function SeoSitePage() {
  const site = await serverGet<SiteSeo>(SEO_API.site);
  return (
    <>
      <Intro>
        <T>The values every page of the website shares: the business details in the footer, the contact page and the structured data, robots.txt and the verification codes.</T>
      </Intro>
      <SiteSettings site={site} />
    </>
  );
}
