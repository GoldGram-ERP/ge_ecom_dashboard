"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Whether a click on a row means "open it": not when it landed on a control of the row, not
 * when it came from a menu or dialog the row opened (React passes those up to the row though
 * they are drawn elsewhere on the page), and not when it ended a text selection.
 */
export function isRowClick(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement;
  return (
    event.currentTarget.contains(target) &&
    !target.closest("a, button, input, textarea, select, label") &&
    !window.getSelection()?.toString()
  );
}

/**
 * A table row that opens `href` wherever it is clicked (on a phone the row is drawn as a
 * card). The link inside the row stays: it is what the keyboard and "open in a new tab" use.
 */
export function LinkRow({ href, className, ...props }: ComponentProps<typeof TableRow> & { href: string }) {
  const router = useRouter();
  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={(event) => {
        if (isRowClick(event)) router.push(href);
      }}
      {...props}
    />
  );
}
