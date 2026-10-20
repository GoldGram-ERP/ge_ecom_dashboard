"use client";

import { type ChangeEvent, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/animate-ui/components/radix/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(day: string): Date | undefined {
  if (!DAY.test(day)) return undefined;
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

function toDay(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

/**
 * A date as `YYYY-MM-DD`: typed straight in, or picked from the calendar beside it. Written like
 * a native date input (`value` or `defaultValue`, `onChange` with `event.target.value`), with a
 * calendar the component library draws instead of the browser's.
 */
export function DateField({
  value,
  defaultValue,
  onChange,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const text = value ?? inner;

  /** Reports a complete date, or the empty string when the field is cleared. */
  function commit(day: string) {
    setInner(day);
    if (day === "" || DAY.test(day)) {
      onChange?.({ target: { value: day }, currentTarget: { value: day } } as ChangeEvent<HTMLInputElement>);
    }
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Input
        id={id}
        aria-label={ariaLabel}
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        maxLength={10}
        value={text}
        onChange={(event) => commit(event.target.value.trim())}
        className="min-w-0 flex-1 bg-card"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label={`${ariaLabel ?? "Date"}: open the calendar`} className="shrink-0">
            <CalendarDays />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={toDate(text)}
            defaultMonth={toDate(text)}
            onSelect={(date) => {
              commit(date ? toDay(date) : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
