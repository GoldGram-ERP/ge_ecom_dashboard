"use client"

import * as React from "react"
import { wording } from "@/components/t"
import { cn } from "@/lib/utils"

function Table({
  className,
  stack = true,
  ...props
}: React.ComponentProps<"table"> & {
  /** On a phone each row becomes a block of labelled lines. Off for a small table that fits as it is. */
  stack?: boolean
}) {
  const ref = React.useRef<HTMLTableElement>(null)
  // Each cell learns its column's heading, which the phone layout prints beside the value.
  React.useEffect(() => {
    const table = ref.current
    if (!table || !stack) return
    const labels = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "")
    for (const row of table.querySelectorAll("tbody tr")) {
      const cells = row.querySelectorAll(":scope > td")
      // A row with one cell spanning the table is a message (an empty state), not data.
      if (cells.length !== labels.length) continue
      cells.forEach((cell, index) => cell.setAttribute("data-label", labels[index]))
    }
  })
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        ref={ref}
        data-slot="table"
        data-stack={stack ? "" : undefined}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/60 [&_tr]:border-b [&_tr]:hover:bg-transparent", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, children, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-4 text-start align-middle text-xs font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    >
      {wording(children)}
    </th>
  )
}

function TableCell({ className, children, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pe-0",
        className
      )}
      {...props}
    >
      {wording(children)}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
