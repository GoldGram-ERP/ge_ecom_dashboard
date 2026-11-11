import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import { SEO_API, type Templates } from "@/lib/seo-api";
import { TemplatesTable } from "./templates-table";

// DSH-02: one title and one description pattern per page type and language.
export default async function SeoTemplatesPage() {
  const templates = await serverGet<Templates>(SEO_API.templates);
  return (
    <>
      <Intro>
        <T>A page whose own SEO title or description is empty uses its page type&apos;s pattern here. The website fills the variables from the same data the page shows.</T>
      </Intro>
      <TemplatesTable templates={templates} />
    </>
  );
}
