import { T } from "@/components/t";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewRuleForm } from "./new-rule-form";

// The file's V.newrule (AC-27).
export default function NewRulePage() {
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
          <NewRuleForm />
        </CardContent>
      </Card>
    </>
  );
}
