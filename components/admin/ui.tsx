import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AdminIcon, AlertIcon, MinusIcon, TrendDownIcon, TrendUpIcon } from "./icons";
import { formatChange, trendTone, type AdminIconName, type StatCard } from "@/lib/admin";
import { formatCompactMoney } from "@/lib/format";

/**
 * The console's presentational pieces.
 *
 * Server Components throughout — none of them hold state, and the only
 * interactivity on an admin screen (a chart's hover, the sidebar's collapse)
 * lives in the two client components beside this file. Keeping the bulk of the
 * console out of the client bundle is what lets a list of five hundred rows
 * render without shipping five hundred rows' worth of JavaScript.
 */

/* ── Page furniture ────────────────────────────────────────────────────── */

/** A short description and any page-level actions, under the shell's title. */
export function PageIntro({
  description,
  children,
}: {
  description?: ReactNode;
  children?: ReactNode;
}) {
  if (!description && !children) return null;

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      {description ? (
        <p className="max-w-3xl text-sm text-admin-muted">{description}</p>
      ) : (
        <span />
      )}
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/** A bordered panel with a header — the console's basic unit of layout. */
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "px-5 py-5",
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-admin-border bg-admin-card shadow-sm ${className}`}
    >
      {title || action ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-admin-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </header>
      ) : null}

      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/**
 * The honest panel for a feature that has not shipped.
 *
 * Used wherever an endpoint reports `available: false`. The alternative — an
 * empty table or a row of zeroes — claims the platform has nothing to show,
 * which is a different and untrue statement from "this is not built yet".
 */
export function UnavailablePanel({
  title,
  reason,
  className = "",
}: {
  title: string;
  reason: string;
  className?: string;
}) {
  return (
    <Panel title={title} className={className}>
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-4">
        <span className="mt-0.5 shrink-0 text-admin-muted">
          <AlertIcon size={18} />
        </span>
        <div>
          <p className="text-sm font-medium">Not enabled yet</p>
          <p className="mt-0.5 text-sm text-admin-muted">{reason}</p>
        </div>
      </div>
    </Panel>
  );
}

/**
 * Shown when the account reached a screen whose permission it does not hold.
 *
 * Laravel would answer 403, and that is the real gate — but a 403 page tells an
 * administrator nothing about how to get access. This says which permission is
 * missing instead. It is not a substitute for the gate: the page still refuses
 * to fetch anything, so nothing is disclosed to someone who should not see it.
 */
export function NoAccess({ permission }: { permission: string }) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-card px-6 py-10 text-center shadow-sm">
      <p className="text-sm font-semibold">This section is not open to your account</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-admin-muted">
        It requires the <span className="font-medium text-admin-text">{permission}</span>{" "}
        permission, which your role does not hold. A super administrator can grant it under Roles
        &amp; Permissions.
      </p>
    </div>
  );
}

export function EmptyPanel({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-6 text-center text-sm text-admin-muted">
      {label}
    </p>
  );
}

/* ── Filters ───────────────────────────────────────────────────────────── */

/**
 * The filter controls, in their console styling.
 *
 * Plain elements rather than the public `Field` primitives: the console's
 * filters sit on a dense toolbar where the label is a caption above the control,
 * not a floating hint, and every list page repeats the same six of them.
 */
/**
 * The console's control styling, shared by every input, select and textarea.
 *
 * Exported because the console's forms live beside their routes and are built
 * from the same three controls; a second copy of this string is a second place
 * for a focus ring to go missing.
 */
export const CONTROL =
  "w-full rounded-md border border-admin-border bg-admin-card px-2.5 py-2 text-sm text-admin-text placeholder:text-admin-muted focus:border-admin-accent focus:outline-none";

export function AdminInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${CONTROL} ${className}`} />;
}

export function AdminSelect({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`${CONTROL} ${className}`} />;
}

export function AdminTextarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${CONTROL} ${className}`} />;
}

/**
 * A labelled checkbox.
 *
 * The console's own rather than the public `Field` primitive because an
 * administrator's toggles — "active", "public" — are captioned with a sentence
 * about what the switch does, not a field name.
 */
export function AdminCheck({
  label,
  hint,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className={`flex items-start gap-2.5 text-sm ${className}`}>
      <input type="checkbox" {...props} className="mt-0.5 h-4 w-4 accent-admin-accent" />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-admin-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * A captioned control with room for a field error.
 *
 * The error replaces the hint rather than sitting under it: when Laravel has
 * refused something, the guidance the administrator was reading is no longer
 * the most useful sentence on screen.
 */
export function FormField({
  label,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string[];
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-admin-muted ${className}`}>
      {label}
      {children}
      {error && error.length > 0 ? (
        <span className="text-danger">{error.join(" ")}</span>
      ) : hint ? (
        <span className="font-normal">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * A row of filter controls.
 *
 * A `GET` form with no action, so it submits its fields to the page it is on and
 * the filters land in the query string. That keeps a filtered list a URL: it can
 * be bookmarked, shared, and reloaded, and the browser's back button works.
 */
export function FilterBar({
  action,
  children,
}: {
  action?: string;
  children: ReactNode;
}) {
  return (
    <form
      method="get"
      action={action}
      className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-admin-border bg-admin-card px-4 py-3 shadow-sm"
    >
      {children}
    </form>
  );
}

export function FilterField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-admin-muted ${className}`}>
      {label}
      {children}
    </label>
  );
}

/**
 * Link-based tabs and filter chips.
 *
 * Filters live in the query string rather than in component state: the page is a
 * Server Component that reads `searchParams`, so a filtered view is a URL that
 * can be bookmarked, shared and reloaded — and the browser's back button works.
 */
export function LinkChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-admin-accent bg-admin-accent-soft text-admin-accent"
          : "border-admin-border bg-admin-card text-admin-muted hover:bg-admin-surface hover:text-admin-text"
      }`}
    >
      {children}
    </Link>
  );
}

/** A submit button for a filter form. */
export function FilterSubmit({ children = "Apply" }: { children?: ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-md bg-admin-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-admin-secondary"
    >
      {children}
    </button>
  );
}

/* ── Figures ───────────────────────────────────────────────────────────── */

/** Which glyph each statistic card wears. */
const CARD_ICONS: Record<string, AdminIconName> = {
  total_users: "users",
  total_customers: "users",
  total_professionals: "hardHat",
  verified_professionals: "shieldCheck",
  pending_verifications: "clock",
  service_requests: "clipboard",
  active_bookings: "calendar",
  completed_bookings: "calendar",
  cancelled_bookings: "calendar",
  total_payments: "card",
  platform_revenue: "chart",
  open_complaints: "flag",
};

/**
 * One statistic card.
 *
 * Every figure here comes from the API with its own comparison already worked
 * out: the value, the value one window earlier, the change, and — crucially —
 * a null percentage when there was nothing to compare against. A card showing
 * "+100%" against a base of zero is arithmetic on a number that does not exist,
 * so the dash is shown instead.
 */
export function MetricCard({ card }: { card: StatCard }) {
  const tone = trendTone(card);
  const display =
    card.format === "money"
      ? formatCompactMoney(card.value)
      : card.value === null
        ? "—"
        : card.value.toLocaleString();

  const trendClasses = {
    positive: "text-success",
    negative: "text-danger",
    flat: "text-admin-muted",
    unknown: "text-admin-muted",
  }[tone];

  const TrendIcon =
    tone === "unknown" ? MinusIcon : card.trend === "up" ? TrendUpIcon : card.trend === "down" ? TrendDownIcon : MinusIcon;

  return (
    <div className="rounded-xl border border-admin-border bg-admin-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">{card.label}</p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-admin-surface text-admin-muted">
          <AdminIcon name={CARD_ICONS[card.key] ?? "grid"} size={16} />
        </span>
      </div>

      {card.available ? (
        <>
          <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{display}</p>

          <p className={`mt-1 flex items-center gap-1.5 text-xs ${trendClasses}`}>
            <TrendIcon size={14} />
            <span className="font-medium">{formatChange(card)}</span>
            <span className="text-admin-muted">
              {card.previous === null
                ? "no earlier figure"
                : `vs ${card.format === "money" ? formatCompactMoney(card.previous) : card.previous.toLocaleString()} before`}
            </span>
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-admin-muted">—</p>
          <p className="mt-1 text-xs text-admin-muted">Not measured yet</p>
        </>
      )}
    </div>
  );
}

/** The responsive grid the statistic cards sit in. */
export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
  );
}

/**
 * A compact figure for the analytics panels.
 *
 * Smaller than a statistic card because it sits inside a panel that already has
 * a heading, and because the analytics screens show several of them in a row —
 * card-sized numbers four-to-a-line would compete with the chart underneath.
 */
export function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-admin-muted uppercase">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight tabular-nums">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-admin-muted">{hint}</p> : null}
    </div>
  );
}

/** A label/value pair, for detail panels. */
export function KeyValue({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-admin-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm break-words">{children}</dd>
    </div>
  );
}

/** A status pill in the console's own palette. */
export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  children: ReactNode;
}) {
  const classes = {
    neutral: "border-admin-border bg-admin-surface text-admin-muted",
    success: "border-success/30 bg-success-50 text-success",
    warning: "border-accent/30 bg-accent-50 text-accent-600",
    danger: "border-danger/30 bg-danger-50 text-danger",
    accent: "border-admin-accent/30 bg-admin-accent-soft text-admin-accent",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${classes}`}
    >
      {children}
    </span>
  );
}

/** Maps a domain status onto a pill tone, consistently across every screen. */
export function statusPillTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "completed":
    case "paid":
    case "verified":
    case "active":
    case "resolved":
    case "accepted":
      return "success";
    case "pending":
    case "quoted":
    case "scheduled":
    case "processing":
    case "open":
    case "under_review":
    case "on_the_way":
    case "in_progress":
    case "awarded":
      return "warning";
    case "cancelled":
    case "failed":
    case "rejected":
    case "suspended":
    case "disputed":
    case "expired":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * The system-health verdict.
 *
 * "Not configured" is deliberately its own state rather than a shade of green or
 * red: a service nobody has set up is neither working nor broken, and painting
 * it green is the mistake this panel exists to avoid.
 */
export function healthTone(
  status: string,
): "neutral" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "operational":
      return "success";
    case "degraded":
      return "warning";
    case "down":
      return "danger";
    default:
      return "neutral";
  }
}

export function healthLabel(status: string): string {
  switch (status) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    case "not_configured":
      return "Not configured";
    default:
      return status;
  }
}

/** A tone-coloured dot for the activity timeline. */
export function ToneDot({ tone }: { tone: string }) {
  const classes: Record<string, string> = {
    success: "bg-success",
    accent: "bg-admin-accent",
    danger: "bg-danger",
    neutral: "bg-admin-muted",
  };

  return <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${classes[tone] ?? "bg-admin-muted"}`} />;
}
