import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import { type LayoutAdmin, SEO_API } from "@/lib/seo-api";
import { LayoutScreen } from "./layout-screen";

// PG-01, NAV-03: the home page's sections and the website's two menus.
export default async function SeoLayoutPage() {
  const data = await serverGet<LayoutAdmin>(SEO_API.layout);
  return (
    <>
      <Intro>
        <T>Choose which sections the home page shows and in what order, which products are popular, and the links in the header and footer menus.</T>
      </Intro>
      <LayoutScreen data={data} />
    </>
  );
}
