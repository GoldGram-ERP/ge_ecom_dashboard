import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { isArabic, serverGet, serverList } from "@/lib/api-server";
import { firstParam } from "@/lib/query";
import type { Category, Manufacturer, Product, ProductType, Settings } from "@/lib/types";
import { Products } from "./products";

// One screen of the catalog (AC-26). `?f=` is the card filter.
export default async function ProductsPage(props: PageProps<"/catalog/products">) {
  const f = firstParam((await props.searchParams).f);
  const filter = f === "active" || f === "inactive" ? f : "all";
  const ar = await isArabic();
  // The product form offers the other three lists; "Out of stock" follows the setting.
  const [items, categories, types, manufacturers, settings] = await Promise.all([
    serverList<Product>("/admin/catalog/products"),
    serverList<Category>("/admin/catalog/categories"),
    serverList<ProductType>("/admin/catalog/types"),
    serverList<Manufacturer>("/admin/catalog/manufacturers"),
    serverGet<Settings>("/admin/settings"),
  ]);

  return (
    <>
      <Intro>
        <T>Every name is stored in English and Arabic. Deactivate an item to hide it without losing
        it; delete removes it for good.</T>
      </Intro>
      <Products
        items={items}
        categories={categories}
        types={types}
        manufacturers={manufacturers}
        requireStock={settings.requireStock}
        filter={filter}
        ar={ar}
      />
    </>
  );
}
