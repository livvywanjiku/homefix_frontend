import type { ReactNode } from "react";
import { Card } from "./card";

/**
 * A single dashboard figure.
 *
 * The dashboards in spec §3, §4 and §20 are all the same shape — a labelled
 * number — so they share one component rather than four bespoke layouts.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "brand" | "accent" | "success";
}) {
  const valueTone = {
    default: "text-foreground",
    brand: "text-brand",
    accent: "text-accent-600 dark:text-accent",
    success: "text-success",
  }[tone];

  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${valueTone}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

/** The responsive grid the stat tiles sit in. */
export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}
