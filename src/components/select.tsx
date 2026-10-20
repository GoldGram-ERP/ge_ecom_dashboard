"use client";

import { type ChangeEvent, Children, isValidElement, type ReactElement, type ReactNode, useState } from "react";
import { Select as SelectRoot, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { T, useT } from "@/components/t";
import { cn } from "@/lib/utils";

// Radix refuses an empty item value, and "All delivery types" is exactly that.
const EMPTY = "__empty__";

interface Option {
  value: string;
  label: ReactNode;
}

function optionsOf(children: ReactNode): Option[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<{ value?: string | number; children?: ReactNode }> => isValidElement(child))
    .map((option) => ({
      value: String(option.props.value ?? option.props.children ?? ""),
      label: option.props.children,
    }));
}

/**
 * A select whose list is drawn by the component library, never by the browser. It is written
 * like a native one: `<option>` children, `value` or `defaultValue`, `name` for a form, and an
 * `onChange` that receives `event.target.value`.
 */
export function Select({
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const t = useT();
  const options = optionsOf(children);
  const [inner, setInner] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const current = value === undefined ? inner : String(value);

  function choose(next: string) {
    const chosen = next === EMPTY ? "" : next;
    setInner(chosen);
    // What a handler written for a native select reads, and may write to put the old value back.
    const target = {
      name,
      get value() {
        return chosen;
      },
      set value(previous: string) {
        setInner(String(previous));
      },
    };
    onChange?.({ target, currentTarget: target } as unknown as ChangeEvent<HTMLSelectElement>);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <SelectRoot value={current === "" ? EMPTY : current} onValueChange={choose} disabled={disabled}>
        <SelectTrigger id={id} aria-label={ariaLabel === undefined ? undefined : t(ariaLabel)} className={cn("h-9 w-full bg-card data-[size=default]:h-9", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          // Grows out of the field it belongs to, on an ease-out that settles without bounce.
          className="duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] data-closed:duration-150"
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value === "" ? EMPTY : option.value}>
              <T>{option.label}</T>
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
    </>
  );
}
