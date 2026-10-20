import { T } from "@/components/t";
import { CountCards } from "@/components/count-cards";
import { Intro } from "@/components/parts";
import { isArabic, serverList } from "@/lib/api-server";
import { buildHref, firstParam } from "@/lib/query";
import type { PaymentMethod } from "@/lib/types";
import { MethodsTable } from "./methods-table";

// The file's V.pay (AC-28).
export default async function PaymentMethodsPage(props: PageProps<"/payment-methods">) {
  const f = firstParam((await props.searchParams).f);
  const filter = f === "active" || f === "inactive" ? f : "all";
  const ar = await isArabic();
  const methods = await serverList<PaymentMethod>("/admin/payment-methods");
  const count = (active: boolean) => methods.filter((method) => method.active === active).length;
  const here = (key: string) => buildHref("/payment-methods", { f: key });

  return (
    <>
      <Intro>
        <T>Fees are added to the order total. Example: a 256 EGP order paid by InstaPay with a fixed
        fee of 10 totals 266.</T>
      </Intro>
      <CountCards
        current={filter}
        cards={[
          { key: "all", label: "Total", count: methods.length, note: "Payment methods", href: here("") },
          { key: "active", label: "Active", count: count(true), note: "Shown at checkout", href: here("active") },
          { key: "inactive", label: "Inactive", count: count(false), note: "Hidden", href: here("inactive") },
        ]}
      />
      <MethodsTable
        methods={
          filter === "all" ? methods : methods.filter((method) => (filter === "active") === method.active)
        }
        ar={ar}
      />
    </>
  );
}
