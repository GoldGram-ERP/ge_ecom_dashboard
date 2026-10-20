import { T } from "@/components/t";
import { CountCards } from "@/components/count-cards";
import { Intro } from "@/components/parts";
import { isArabic, serverList } from "@/lib/api-server";
import { buildHref, firstParam } from "@/lib/query";
import type { Product } from "@/lib/types";
import { CashbackTable } from "./cashback-table";

// The file's V.cash (AC-26): one cashback policy per product.
export default async function CashbackPage(props: PageProps<"/cashback">) {
  const f = firstParam((await props.searchParams).f);
  const filter = f === "valid" || f === "invalid" ? f : "all";
  const ar = await isArabic();
  const products = await serverList<Product>("/admin/catalog/products");
  const count = (valid: boolean) => products.filter((product) => product.cashback.valid === valid).length;
  const here = (key: string) => buildHref("/cashback", { f: key });

  return (
    <>
      <Intro>
        <T>What a customer gets back when reselling the physical item, depending on whether the
        original packaging is intact, plus the labor portion that applies.</T>
      </Intro>
      <CountCards
        current={filter}
        cards={[
          { key: "all", label: "Total", count: products.length, note: "One per product", href: here("") },
          { key: "valid", label: "Valid", count: count(true), note: "Offered to customers", href: here("valid") },
          { key: "invalid", label: "Not valid", count: count(false), note: "Switched off", href: here("invalid") },
        ]}
      />
      <CashbackTable
        products={
          filter === "all"
            ? products
            : products.filter((product) => (filter === "valid") === product.cashback.valid)
        }
        ar={ar}
      />
    </>
  );
}
