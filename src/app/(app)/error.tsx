"use client"; // Error boundaries must be Client Components

import { T } from "@/components/t";
import { useEffect } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// A screen that cannot load its data shows this card, never a blank page (EC-15).
export default function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card role="alert" className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-heading text-lg"><T>Could not load this screen</T></CardTitle>
        <CardDescription>
          <T>Could not reach the server, or it answered with an error. Nothing was changed. Try again.</T>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Button variant="gold" className="w-fit" onClick={() => retry()}>
          <T>Try again</T>
        </Button>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">
            <T>Reference for support:</T> <span className="num">{error.digest}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
