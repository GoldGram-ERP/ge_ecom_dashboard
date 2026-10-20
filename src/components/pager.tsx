import { T } from "@/components/t";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";

/**
 * The paging row under a table: Previous, Next, "Page 1 of 4 · …". A direction with nowhere to
 * go is a disabled button. `children` come last (the orders "Rows" select).
 */
export function Pager({
  previous,
  next,
  text,
  children,
}: {
  previous: string | null;
  next: string | null;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <span><T>{text}</T></span>
      {children ? <span className="flex items-center gap-2">{children}</span> : null}
      <span className="ms-auto flex items-center gap-1.5">
        {previous ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={previous} scroll={false}>
              <ChevronLeft className="rtl:rotate-180" />
              <T>Previous</T>
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="rtl:rotate-180" />
            <T>Previous</T>
          </Button>
        )}
        {next ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={next} scroll={false}>
              <T>Next</T>
              <ChevronRight className="rtl:rotate-180" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <T>Next</T>
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        )}
      </span>
    </div>
  );
}
