import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverList } from "@/lib/api-server";
import type { AdminFaqItem } from "@/lib/types";
import { Faq } from "./faq";

// The website's frequently asked questions, in English and Arabic.
export default async function FaqPage() {
  const items = await serverList<AdminFaqItem>("/admin/faq");
  return (
    <>
      <Intro>
        <T>Only active questions are shown on the website, in the order of their sort number.</T>
      </Intro>
      <Faq items={items} />
    </>
  );
}
