import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { isArabic, serverList } from "@/lib/api-server";
import { firstParam } from "@/lib/query";
import type { Category } from "@/lib/types";
import { Categories } from "./categories";

// One screen of the catalog (AC-26). `?f=` is the card filter.
export default async function CategoriesPage(props: PageProps<"/catalog/categories">) {
  const f = firstParam((await props.searchParams).f);
  const filter = f === "active" || f === "inactive" ? f : "all";
  const ar = await isArabic();
  const items = await serverList<Category>("/admin/catalog/categories");

  return (
    <>
      <Intro>
        <T>Every name is stored in English and Arabic. Deactivate an item to hide it without losing
        it; delete removes it for good.</T>
      </Intro>
      <Categories items={items} filter={filter} ar={ar} />
    </>
  );
}
