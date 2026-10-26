import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverList } from "@/lib/api-server";
import type { AdminArticle } from "@/lib/types";
import { Articles } from "./articles";

// The articles of the website's content section, in English and Arabic.
export default async function ArticlesPage() {
  const items = await serverList<AdminArticle>("/admin/articles");
  return (
    <>
      <Intro>
        <T>Articles are shown on the website once they are published. Photos can be added after the article is created.</T>
      </Intro>
      <Articles items={items} />
    </>
  );
}
