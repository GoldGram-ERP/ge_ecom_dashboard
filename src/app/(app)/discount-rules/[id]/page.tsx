import { T } from "@/components/t";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isArabic, serverList } from "@/lib/api-server";
import type { DiscountRule } from "@/lib/types";
import { NewRuleForm } from "../new/new-rule-form";

// Editing one discount rule: the "new rule" form, filled in.
export default async function EditRulePage(props: PageProps<"/discount-rules/[id]">) {
  const { id } = await props.params;
  const rule = (await serverList<DiscountRule>("/admin/discount-rules")).find((item) => String(item.id) === id);
  const ar = await isArabic();

  return (
    <>
      <Button variant="outline" className="w-fit" asChild>
        <Link href="/discount-rules">
          <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
          <T>Back to discount rules</T>
        </Link>
      </Button>
      {rule ? (
        <Card className="max-w-[860px]">
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Edit</T> {(ar && rule.nameAr) || rule.nameEn}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <NewRuleForm rule={rule} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground"><T>There is no discount rule at this address. Open one from the list.</T></p>
      )}
    </>
  );
}
