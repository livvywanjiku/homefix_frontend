/**
 * A loading placeholder.
 *
 * Used with Suspense boundaries so a slow Laravel call shows the shape of the
 * content that is coming rather than a spinner that shifts the layout when it
 * resolves.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-line/70 ${className}`}
    />
  );
}

/** A placeholder for a list of rows, matching the table and card layouts. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}
