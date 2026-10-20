import Link from "next/link";
import { T } from "@/components/t";
import { cn } from "@/lib/utils";

export interface CountCard {
  key: string;
  label: string;
  count: number;
  note: string;
  /** The same screen with this card's filter in the URL. */
  href: string;
}

/** The row of count cards above a table. Each one filters the table under it. */
export function CountCards({ current, cards }: { current: string; cards: CountCard[] }) {
  return (
    <div className={cn("grid gap-3", cards.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          scroll={false}
          aria-current={current === card.key ? "true" : undefined}
          className={cn(
            "min-w-0 rounded-xl bg-card p-3 ring-1 sm:p-4 ring-foreground/10 outline-none transition-[box-shadow,background-color,scale] hover:ring-gold/70 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.985]",
            current === card.key && "bg-accent ring-2 ring-gold hover:ring-gold",
          )}
        >
          <span className="block truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs"><T>{card.label}</T></span>
          <b className="num mt-1 block text-3xl font-medium text-secondary-foreground">{card.count}</b>
          <small className="block truncate text-xs text-muted-foreground"><T>{card.note}</T></small>
        </Link>
      ))}
    </div>
  );
}
