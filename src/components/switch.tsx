"use client";

import { Switch as AnimatedSwitch } from "@/components/animate-ui/components/radix/switch";
import { useT } from "@/components/t";

/** An on/off switch that saves as it changes. `label` is what a screen reader hears. */
export function Switch({
  on,
  label,
  locked = false,
  onToggle,
}: {
  on: boolean;
  label: string;
  /** The SUPER_ADMIN column of the permission table: shown, never changeable. */
  locked?: boolean;
  onToggle?: () => void;
}) {
  const t = useT();
  return (
    <AnimatedSwitch
      checked={on}
      aria-label={t(label)}
      disabled={locked}
      onCheckedChange={() => onToggle?.()}
      // the "off" track is dark enough to be seen on a white card
      className="data-[state=checked]:bg-success data-[state=unchecked]:bg-[#B5AA97]"
    />
  );
}
