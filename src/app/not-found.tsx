import { T } from "@/components/t";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Page not found · GoldGram Admin" };

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-svh max-w-xl place-content-center p-6">
      <Card>
        <CardHeader>
          <h1 className="font-heading text-xl font-medium"><T>Page not found</T></h1>
          <CardDescription>
            <T>There is nothing at this address. It may have been mistyped, or the link is out of date.</T>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="gold" asChild>
            <Link href="/"><T>Go to the dashboard</T></Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
