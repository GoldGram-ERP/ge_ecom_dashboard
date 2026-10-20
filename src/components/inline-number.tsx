"use client";

import { Input } from "@/components/ui/input";

/**
 * A number typed straight into a table cell, saved when the field is left or Enter is pressed.
 * `onCommit` resolves to false when the value was not saved; the field then goes back to what
 * the server holds.
 */
export function InlineNumber({
  value,
  label,
  width = 90,
  onCommit,
}: {
  value: string;
  label: string;
  width?: number;
  onCommit: (text: string) => Promise<boolean>;
}) {
  return (
    <Input
      // A new value from the server replaces the field, so it never shows a stale number.
      key={value}
      type="number"
      step="any"
      min="0"
      defaultValue={value}
      style={{ width }}
      className="num bg-card text-end"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      onBlur={async (event) => {
        const input = event.currentTarget;
        if (input.value === value) return;
        if (!(await onCommit(input.value))) input.value = value;
      }}
    />
  );
}
