import { T } from "@/components/t";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverList } from "@/lib/api-server";
import type { Zone } from "@/lib/types";
import { NewRuleForm } from "./new-rule-form";

// The file's V.newrule (AC-27).
export default async function NewRulePage() {
  // The governorates a rule can be limited to are the shipping zones on the geography page.
  const zones = await serverList<Zone>("/admin/geo/zones");
  return (
    <>
      <Button variant="outline" className="w-fit" asChild>
        <Link href="/discount-rules">
          <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
          <T>Back to discount rules</T>
        </Link>
      </Button>
      <Card className="max-w-[860px]">
        <CardHeader>
          <CardTitle className="font-heading text-lg"><T>New discount rule</T></CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <NewRuleForm zones={zones} />
        </CardContent>
      </Card>
    </>
  );
}
