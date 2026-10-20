"use client";

import { T } from "@/components/t";
import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/animate-ui/components/radix/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog";
import { wording } from "@/components/t";
import { cn } from "@/lib/utils";

/** A dialog that is open while it is mounted. Closes on Escape, the close button and a click outside. */
export function Modal({
  title,
  description,
  actions,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  /** Buttons beside the title, for what can be done to the whole item. */
  actions?: ReactNode;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* A long dialog scrolls inside itself, so its buttons stay reachable on a short screen. */}
      <DialogContent className={cn("max-h-[calc(100dvh-2rem)] overflow-y-auto", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pe-8">
            <DialogTitle className="text-start font-heading text-lg">{wording(title)}</DialogTitle>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {description ? <DialogDescription className="text-start">{wording(description)}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/** A yes/no question before something that cannot be undone. */
export function Confirm({
  question,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  question: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-start font-heading text-lg">{wording(question)}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel><T>Cancel</T></AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={danger ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            // The dialog stays until the server has answered; the caller closes it.
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {wording(confirmLabel)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
