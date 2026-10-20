"use client";

import { T } from "@/components/t";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";

/** Asks the server for the page again, for error states drawn by a Server Component. */
export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="gold" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      <T>{pending ? "Trying…" : "Try again"}</T>
    </Button>
  );
}
