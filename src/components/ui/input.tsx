"use client"

import * as React from "react"
import { useT } from "@/components/t"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // A number is typed and nothing else: a browser's number box also changes under the mouse
  // wheel and its arrows, which alters prices and stock by accident. The screens check what
  // was typed themselves, so a plain text box with the numeric keypad is enough.
  const numeric = type === "number";
  const t = useT();
  return (
    <input
      type={numeric ? "text" : type}
      inputMode={numeric ? "decimal" : undefined}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      placeholder={props.placeholder === undefined ? undefined : t(props.placeholder)}
      aria-label={props["aria-label"] === undefined ? undefined : t(props["aria-label"])}
    />
  )
}

export { Input }
