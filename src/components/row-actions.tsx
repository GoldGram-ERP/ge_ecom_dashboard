"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { useT, wording } from "@/components/t";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";

/**
 * The actions of one table row behind a single button: it opens a menu that names every
 * action, so a row stays narrow and nobody has to guess what an icon means.
 * `label` is what a screen reader hears for the button, e.g. "Actions for Nour Tester".
 */
export function RowActions({ label, children }: { label: string; children: ReactNode }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline" aria-label={t(label)} className="bg-card">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One line of the menu: it opens `href`, or does `onSelect` on the spot. */
export function RowAction({
  label,
  icon,
  href,
  onSelect,
  danger = false,
  disabled = false,
}: {
  label: string;
  icon: ReactNode;
  href?: string;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  return (
    <DropdownMenuItem
      variant={danger ? "destructive" : "default"}
      disabled={disabled}
      // The animated menu item cannot wrap a link, so a navigating action pushes its route.
      onSelect={href ? () => router.push(href) : onSelect}
    >
      {icon}
      {wording(label)}
    </DropdownMenuItem>
  );
}

/** The line between the everyday actions and the ones that are hard to take back. */
export const RowActionsSeparator = DropdownMenuSeparator;
