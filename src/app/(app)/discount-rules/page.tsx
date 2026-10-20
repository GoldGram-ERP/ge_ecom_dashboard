import { T } from "@/components/t";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { CountCards } from "@/components/count-cards";
import { Intro } from "@/components/parts";
import { isArabic, serverList } from "@/lib/api-server";
import { buildHref, firstParam } from "@/lib/query";
import type { DiscountRule } from "@/lib/types";
import { RulesTable } from "./rules-table";

// The file's V.rules (AC-27). `?f=` is its card filter. The status of a rule is the server's.
export default async function DiscountRulesPage(props: PageProps<"/discount-rules">) {
  const wanted = firstParam((await props.searchParams).f);
  const filter = wanted === "Active" || wanted === "Scheduled" || wanted === "Inactive" ? wanted : "all";

  const ar = await isArabic();
  const rules = await serverList<DiscountRule>("/admin/discount-rules");
  const count = (status: string) => rules.filter((rule) => rule.status === status).length;
  const here = (f: string) => buildHref("/discount-rules", { f });

  return (
    <>
      <Intro>
        <T>Discounts apply only to the labor or shipping line, never to the gold value. Status comes
        from the dates and the on/off switch.</T>
      </Intro>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="gold" asChild>
          <Link href="/discount-rules/new">
            <Plus aria-hidden="true" />
            <T>New rule</T>
          </Link>
        </Button>
      </div>
      <CountCards
        current={filter}
        cards={[
          { key: "all", label: "Total", count: rules.length, note: "All rules", href: here("") },
          { key: "Active", label: "Active", count: count("Active"), note: "Applying now", href: here("Active") },
          { key: "Scheduled", label: "Scheduled", count: count("Scheduled"), note: "Start in the future", href: here("Scheduled") },
          { key: "Inactive", label: "Inactive", count: count("Inactive"), note: "Off or expired", href: here("Inactive") },
        ]}
      />
      <RulesTable rules={filter === "all" ? rules : rules.filter((rule) => rule.status === filter)} ar={ar} />
    </>
  );
}
