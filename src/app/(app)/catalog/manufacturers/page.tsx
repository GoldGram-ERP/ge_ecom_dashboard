import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { isArabic, serverList } from "@/lib/api-server";
import { firstParam } from "@/lib/query";
import type { Manufacturer } from "@/lib/types";
import { Manufacturers } from "./manufacturers";

// One screen of the catalog (AC-26). `?f=` is the card filter.
export default async function ManufacturersPage(props: PageProps<"/catalog/manufacturers">) {
  const f = firstParam((await props.searchParams).f);
  const filter = f === "active" || f === "inactive" ? f : "all";
  const ar = await isArabic();
  const items = await serverList<Manufacturer>("/admin/catalog/manufacturers");

  return (
    <>
      <Intro>
        <T>Every name is stored in English and Arabic. Deactivate an item to hide it without losing
        it; delete removes it for good.</T>
      </Intro>
      <Manufacturers items={items} filter={filter} ar={ar} />
    </>
  );
}
