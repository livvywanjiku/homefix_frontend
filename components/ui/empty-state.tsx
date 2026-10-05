import type { ReactNode } from "react";

/**
 * The "nothing here yet" state.
 *
 * Every list in the app can be empty — a new customer has no requests, a new
 * professional has no reviews — so the empty state is a component with a
 * consistent voice rather than a bare "No data" string. `action` is where the
 * call to action that resolves the emptiness goes.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-card px-6 py-12 text-center">
      <p className="font-medium text-foreground">{title}</p>

      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}

      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
