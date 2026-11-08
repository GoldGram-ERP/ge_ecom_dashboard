import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { isArabic, serverGet, serverList } from "@/lib/api-server";
import type { Product, Settings } from "@/lib/types";
import { Stock } from "./stock";

// Stock of every product in one place: add pieces when new ones arrive, remove them when some are lost or sold elsewhere.
export default async function StockPage() {
  const ar = await isArabic();
  const [items, settings] = await Promise.all([
    serverList<Product>("/admin/catalog/products"),
    serverGet<Settings>("/admin/settings"),
  ]);
  return (
    <>
      <Intro>
        <T>Add pieces when new stock arrives and remove them when some are lost or sold elsewhere. Orders take their pieces from here automatically.</T>
      </Intro>
      <Stock items={items} requireStock={settings.requireStock} ar={ar} />
    </>
  );
}
