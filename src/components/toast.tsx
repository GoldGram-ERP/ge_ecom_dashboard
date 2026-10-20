"use client";

import { toast as notify, Toaster } from "sonner";
import { toArabic } from "@/i18n/translate";

/** One short message at the bottom of the screen: `toast("Price published and logged")`. */
export function toast(message: string): void {
  // Called from event handlers, where no hook can be used: the page itself says which language it is in.
  const text = document.documentElement.lang === "ar" ? toArabic(message) : message;
  // A long sentence (an error) stays long enough to be read.
  notify(text, { duration: text.length > 40 ? 5000 : 2400 });
}

/** Mounted once, by the shell and by the sign-in page. */
export function Toast() {
  return (
    <Toaster
      theme="light"
      position="bottom-center"
      toastOptions={{
        classNames: { toast: "!bg-navy-deep !text-gold-light !border-transparent !rounded-xl !font-sans !shadow-lg" },
      }}
    />
  );
}
