import type { ReactNode } from "react";

const TONES = {
  neutral: "border-line bg-surface text-muted-foreground",
  brand: "border-brand/25 bg-brand-50 text-brand-600 dark:bg-brand/15 dark:text-brand-50",
  accent: "border-accent/30 bg-accent-50 text-accent-600 dark:bg-accent/15 dark:text-accent",
  success:
    "border-success/25 bg-success-50 text-success dark:bg-success/15 dark:text-green-300",
  danger: "border-danger/25 bg-danger-50 text-danger dark:bg-danger/15 dark:text-red-300",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * The verified-professional badge.
 *
 * Verification is the platform's core trust signal (spec §19), so it gets its
 * own component rather than being assembled ad hoc — the tick, the wording and
 * the tone should be identical everywhere it appears.
 */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <Badge tone="brand" className={className}>
      <span aria-hidden="true">✓</span>
      Verified
    </Badge>
  );
}

/**
 * Maps a domain status string onto a badge tone.
 *
 * Kept here so every status pill in the app agrees on what "good" looks like,
 * instead of each screen inventing its own colour for `completed`.
 */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "completed":
    case "paid":
    case "verified":
    case "resolved":
    case "accepted":
    case "published":
      return "success";

    case "pending":
    case "quoted":
    case "scheduled":
    case "processing":
    case "open":
    case "under_review":
    case "on_the_way":
    case "in_progress":
      return "accent";

    case "cancelled":
    case "failed":
    case "rejected":
    case "suspended":
    case "disputed":
      return "danger";

    case "refunded":
    case "withdrawn":
    default:
      return "neutral";
  }
}

/** "on_the_way" -> "On the way" */
export function humaniseStatus(status: string): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{humaniseStatus(status)}</Badge>;
}
