"use client";

import { Children, createContext, type ReactNode, useContext } from "react";
import { toArabic } from "@/i18n/translate";

const Arabic = createContext(false);
const asIs = (text: string) => text;

/** Set once, in the root layout, from the language cookie. */
export function LangProvider({ ar, children }: { ar: boolean; children: ReactNode }) {
  return <Arabic.Provider value={ar}>{children}</Arabic.Provider>;
}

/** `const t = useT()` in a Client Component: `t("Save item")` is Arabic when the dashboard is. For attributes and messages. */
export function useT(): (text: string) => string {
  return useContext(Arabic) ? toArabic : asIs;
}

/**
 * The dashboard's wording, in the dashboard's language: `<T>Save item</T>`. Works under Server
 * and Client Components alike. Only text is touched; an element, a number or a name that is
 * not wording passes through as it is, so it is safe around any `{value}`.
 */
export function T({ children }: { children: ReactNode }) {
  const t = useT();
  if (typeof children === "string") return t(children);
  if (!Array.isArray(children)) return children;
  return Children.map(children, (child) => (typeof child === "string" ? t(child) : child));
}

/**
 * For a shared component's `children`: text is translated, anything else is handed on untouched
 * (a single element must stay the direct child of a slot such as `asChild`).
 */
export function wording(children: ReactNode): ReactNode {
  return typeof children === "string" || Array.isArray(children) ? <T>{children}</T> : children;
}
