import { Skeleton } from "@/components/ui/skeleton";

// Shown inside the shell while a screen's data is on its way: the shape of a screen, not a spinner.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-5">
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
