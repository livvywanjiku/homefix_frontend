import type { Metadata } from "next";
import Link from "next/link";
import { BarList, DonutChart, StackedColumns, TrendChart } from "@/components/admin/charts";
import {
  EmptyPanel,
  Figure,
  LinkChip,
  MetricCard,
  MetricGrid,
  Panel,
  Pill,
  ToneDot,
  UnavailablePanel,
  healthLabel,
  healthTone,
  statusPillTone,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  ADMIN_SERIES_COLOURS,
  QUICK_RANGES,
  RANGE_LABELS,
  asDateInput,
  can,
  consoleHref,
  type AdminPermission,
  type AdminRange,
  type AdminUserRow,
  type Availability,
  type BookingAnalytics,
  type DashboardPayload,
  type LocationAnalytics,
  type PendingAction,
  type ProfessionalAnalytics,
  type RevenuePayload,
  type ServiceAnalytics,
  type UserAnalytics,
} from "@/lib/admin";
import { currentAdmin, fetchIf } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatCompactMoney, formatDate, formatMoney, formatRelative } from "@/lib/format";
import type { Booking, Paginated, ProfessionalProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

/*
 * The console's dashboard (spec §20).
 *
 * Every figure on this page is fetched from Laravel. There is no placeholder
 * series, no illustrative sample and no arithmetic done here that the API did
 * not already do — including the percentage change, which arrives alongside the
 * value it describes so that a card and its own trend cannot disagree.
 *
 * The panels are fetched in parallel and each is gated on the permission its
 * Laravel route requires, which is why a few of them can be missing rather than
 * erroring: an administrator without `view_analytics` still gets their
 * statistics and their pending work, and the panels they may not open say so
 * instead of showing an empty chart.
 */

/* ── The window switchers ──────────────────────────────────────────────── */

/*
 * The revenue panel's own scope, independent of the page's date filter.
 *
 * These are periods, and each is named by the period it covers: "Daily" is
 * today, "Monthly" is the last thirty days. The panel states the range and the
 * bucket size Laravel actually returned underneath, so the axis is never
 * described as something it is not.
 */
const REVENUE_SCOPES = [
  { key: "daily", label: "Daily", range: "today" },
  { key: "weekly", label: "Weekly", range: "last_7_days" },
  { key: "monthly", label: "Monthly", range: "last_30_days" },
  { key: "yearly", label: "Yearly", range: "this_year" },
] as const;

/* ── Quick actions ─────────────────────────────────────────────────────── */

/**
 * The shortcuts at the foot of the page.
 *
 * Each carries the permission its destination requires, so the list is filtered
 * the same way the sidebar is — an administrator is never offered a door they
 * cannot open.
 */
const QUICK_ACTIONS: {
  label: string;
  description: string;
  href: string;
  permission: AdminPermission;
}[] = [
  {
    label: "Review verification queue",
    description: "Approve or reject professionals waiting on their documents.",
    href: "/admin/verification",
    permission: "verify_professional",
  },
  {
    label: "Add a service",
    description: "Extend the catalogue professionals can price against.",
    href: "/admin/services",
    permission: "manage_service_catalogue",
  },
  {
    label: "Invite an administrator",
    description: "Create another console account and give it a role.",
    href: "/admin/administrators",
    permission: "manage_administrators",
  },
  {
    label: "Adjust roles & permissions",
    description: "Change what a role may do across the platform.",
    href: "/admin/roles",
    permission: "manage_permissions",
  },
  {
    label: "Export a report",
    description: "Take bookings, requests, users or professionals out as CSV.",
    href: "/admin/reports",
    permission: "export_reports",
  },
  {
    label: "Read the audit trail",
    description: "Every administrative action, who took it and when.",
    href: "/admin/audit-logs",
    permission: "view_audit_logs",
  },
  {
    label: "Platform settings",
    description: "Commission, currencies and the public-facing defaults.",
    href: "/admin/settings",
    permission: "manage_settings",
  },
];

/* ── Small helpers ─────────────────────────────────────────────────────── */

/** `searchParams` gives an array for a repeated key; only single values count. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/* ── The page ──────────────────────────────────────────────────────────── */

export default async function AdminDashboardPage(props: PageProps<"/admin/dashboard">) {
  const { session, account } = await currentAdmin();
  const granted = account.permissions;
  const params = await props.searchParams;

  const range = single(params.range);
  const from = single(params.from);
  const to = single(params.to);
  const revenueScope =
    REVENUE_SCOPES.find((scope) => scope.key === single(params.revenue)) ?? REVENUE_SCOPES[2];

  // The dashboard is the one screen the console's own permission protects; a
  // role that can reach `/admin` but not this may still have other pages.
  if (!can(granted, "view_dashboard")) {
    return (
      <UnavailablePanel
        title="Dashboard"
        reason="Your account does not hold the view_dashboard permission. Ask a super administrator to grant it, or open a section from the navigation you do have."
      />
    );
  }

  const token = session.token;
  const search = { range, from, to };

  const [
    dashboard,
    revenue,
    bookings,
    users,
    professionals,
    services,
    locations,
    recentBookings,
    recentUsers,
    recentProfessionals,
  ] = await Promise.all([
    apiFetch<DashboardPayload>("/admin/dashboard", { token, search }),

    // Revenue keeps its own scope, but shares the custom window so that picking
    // a custom period on the dashboard also narrows the revenue chart.
    fetchIf(granted, "view_analytics", () =>
      apiFetch<{ range: AdminRange; revenue: RevenuePayload }>("/admin/revenue", {
        token,
        search: { range: revenueScope.range },
      }),
    ),

    fetchIf(granted, "view_analytics", () =>
      apiFetch<{ range: AdminRange; bookings: BookingAnalytics }>("/admin/bookings/analytics", {
        token,
        search,
      }),
    ),

    fetchIf(granted, "view_analytics", () =>
      apiFetch<{ range: AdminRange; users: UserAnalytics }>("/admin/users/analytics", {
        token,
        search,
      }),
    ),

    fetchIf(granted, "view_analytics", () =>
      apiFetch<{ range: AdminRange; professionals: ProfessionalAnalytics }>(
        "/admin/professionals/analytics",
        { token, search },
      ),
    ),

    fetchIf(granted, "view_analytics", () =>
      apiFetch<{ range: AdminRange; services: ServiceAnalytics }>("/admin/services/analytics", {
        token,
        search,
      }),
    ),

    fetchIf(granted, "view_analytics", () =>
      apiFetch<{ range: AdminRange; locations: LocationAnalytics }>("/admin/locations/analytics", {
        token,
        search,
      }),
    ),

    /*
     * The "recent" tables read the list endpoints rather than the dashboard
     * payload — the dashboard reports totals, and a total is not a row. Each is
     * asked for the newest five, which is what the endpoints already sort by.
     */
    fetchIf(granted, "view_bookings", () =>
      apiFetch<Paginated<Booking>>("/admin/bookings", {
        token,
        search: { per_page: 5 },
      }),
    ),

    fetchIf(granted, "view_users", () =>
      apiFetch<Paginated<AdminUserRow>>("/admin/users", { token, search: { per_page: 5 } }),
    ),

    fetchIf(granted, "view_professionals", () =>
      apiFetch<Paginated<ProfessionalProfile>>("/admin/professionals", {
        token,
        search: { per_page: 5 },
      }),
    ),
  ]);

  const { range: activeRange } = dashboard;
  const windowLabel = `${formatDate(activeRange.from)} – ${formatDate(activeRange.to)}`;
  const revenueReason =
    revenue?.revenue.reason ?? "Payments are not enabled on this installation yet.";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Date filter ────────────────────────────────────────────────── */}

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_RANGES.map((preset) => (
          <LinkChip
            key={preset}
            href={consoleHref("/admin/dashboard", {
              range: preset,
              revenue: single(params.revenue),
            })}
            active={activeRange.preset === preset}
          >
            {RANGE_LABELS[preset]}
          </LinkChip>
        ))}

        {/* A GET form: the custom window is a URL, like every other filter. */}
        <form
          method="get"
          action="/admin/dashboard"
          className="ml-auto flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="range" value="custom" />
          {single(params.revenue) ? (
            <input type="hidden" name="revenue" value={single(params.revenue)} />
          ) : null}

          <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
            From
            <input
              type="date"
              name="from"
              defaultValue={asDateInput(activeRange.from)}
              className="rounded-md border border-admin-border bg-admin-card px-2.5 py-1.5 text-sm text-admin-text focus:border-admin-accent focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
            To
            <input
              type="date"
              name="to"
              defaultValue={asDateInput(activeRange.to)}
              className="rounded-md border border-admin-border bg-admin-card px-2.5 py-1.5 text-sm text-admin-text focus:border-admin-accent focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="rounded-md border border-admin-border bg-admin-card px-3 py-2 text-sm font-medium transition-colors hover:bg-admin-surface"
          >
            Apply range
          </button>
        </form>
      </div>

      <p className="-mt-3 text-xs text-admin-muted">
        Showing <span className="font-medium text-admin-text">{windowLabel}</span> ({activeRange.days}{" "}
        {activeRange.days === 1 ? "day" : "days"}, bucketed by {activeRange.granularity}). Every card
        compares this window with the one immediately before it.
      </p>

      {/* ── The statistics ─────────────────────────────────────────────── */}

      <MetricGrid>
        {dashboard.stats.map((card) => (
          <MetricCard key={card.key} card={card} />
        ))}
      </MetricGrid>

      {/* ── What is waiting ────────────────────────────────────────────── */}

      <Panel
        title="Pending actions"
        description="Work that is sitting on an administrator right now."
        bodyClassName="px-5 py-5"
      >
        {dashboard.pending_actions.length === 0 ? (
          <EmptyPanel label="Nothing is waiting — every queue is clear." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboard.pending_actions.map((action) => (
              <li key={action.key}>
                <PendingCard action={action} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* ── Revenue ────────────────────────────────────────────────────── */}

      {revenue === null ? (
        <UnavailablePanel
          title="Revenue overview"
          reason="Your account does not hold the view_analytics permission."
        />
      ) : !revenue.revenue.available ? (
        <UnavailablePanel title="Revenue overview" reason={revenueReason} />
      ) : (
        <Panel
          title="Revenue overview"
          description={`${RANGE_LABELS[revenueScope.range]} · ${formatDate(revenue.range.from)} – ${formatDate(revenue.range.to)} · bucketed by ${revenue.range.granularity}`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {REVENUE_SCOPES.map((scope) => (
                <LinkChip
                  key={scope.key}
                  href={consoleHref("/admin/dashboard", {
                    range: single(params.range),
                    from,
                    to,
                    revenue: scope.key,
                  })}
                  active={revenueScope.key === scope.key}
                >
                  {scope.label}
                </LinkChip>
              ))}
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <RevenueFigure
                label={`Collected, ${RANGE_LABELS[revenueScope.range].toLowerCase()}`}
                value={revenue.revenue.totals?.period_cents ?? 0}
                previous={revenue.revenue.totals?.previous_period_cents ?? null}
              />
              <RevenueFigure
                label="All time"
                value={revenue.revenue.totals?.all_time_cents ?? 0}
                previous={null}
              />
              <RevenueFigure
                label="This month"
                value={revenue.revenue.totals?.month_cents ?? 0}
                previous={null}
              />
              <RevenueFigure
                label="Refunded"
                value={revenue.revenue.totals?.refunded_cents ?? 0}
                previous={null}
              />
            </dl>

            <TrendChart
              points={revenue.revenue.series}
              format="money"
              title="Revenue"
              height={220}
              emptyLabel="No payments were collected in this period."
            />
          </div>
        </Panel>
      )}

      {/* ── Analytics ──────────────────────────────────────────────────── */}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Bookings"
          description={
            bookings ? `${bookings.bookings.in_period} in this window` : undefined
          }
        >
          {bookings === null ? (
            <PermissionNote />
          ) : !bookings.bookings.available ? (
            <EmptyPanel label="Booking records are not enabled on this installation yet." />
          ) : (
            <div className="flex flex-col gap-5">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Figure label="Total" value={bookings.bookings.total.toLocaleString()} />
                <Figure label="In window" value={bookings.bookings.in_period.toLocaleString()} />
                <Figure
                  label="Completion"
                  value={
                    bookings.bookings.completion_rate === null
                      ? "—"
                      : `${Math.round(bookings.bookings.completion_rate * 100)}%`
                  }
                />
                <Figure
                  label="Cancellation"
                  value={
                    bookings.bookings.cancellation_rate === null
                      ? "—"
                      : `${Math.round(bookings.bookings.cancellation_rate * 100)}%`
                  }
                />
              </dl>

              <TrendChart
                points={bookings.bookings.series}
                title="Bookings over time"
                emptyLabel="No bookings were created in this period."
              />

              <DonutChart
                slices={bookings.bookings.statuses
                  .map((status, index) => ({ status, colour: ADMIN_SERIES_COLOURS[index % ADMIN_SERIES_COLOURS.length] }))
                  .filter(({ status }) => status.total > 0)
                  .map(({ status, colour }) => ({
                    label: status.label,
                    value: status.total,
                    colour,
                  }))}
                caption="Bookings by status, all time"
                emptyLabel="No bookings have been recorded yet."
              />
            </div>
          )}
        </Panel>

        <Panel title="Users">
          {users === null ? (
            <PermissionNote />
          ) : (
            <div className="flex flex-col gap-5">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Figure label="Customers" value={users.users.roles.customers.toLocaleString()} />
                <Figure
                  label="Professionals"
                  value={users.users.roles.professionals.toLocaleString()}
                />
                <Figure
                  label="Administrators"
                  value={users.users.roles.administrators.toLocaleString()}
                />
                <Figure
                  label="New in window"
                  value={users.users.new_in_period.toLocaleString()}
                />
              </dl>

              <TrendChart
                points={users.users.series}
                title="Signups over time"
                emptyLabel="Nobody registered in this period."
              />

              <StackedColumns
                points={users.users.series_by_role}
                keys={[
                  { key: "customer", label: "Customers", colour: ADMIN_SERIES_COLOURS[0] },
                  { key: "professional", label: "Professionals", colour: ADMIN_SERIES_COLOURS[1] },
                ]}
                title="Signups by role"
                emptyLabel="Nobody registered in this period."
              />

              {users.users.registrations_by_location.length > 0 ? (
                <>
                  <h3 className="text-xs font-semibold tracking-wide text-admin-muted uppercase">
                    Where new customers are posting from
                  </h3>
                  <BarList
                    rows={users.users.registrations_by_location.map((row) => ({
                      label: row.name,
                      value: row.total,
                    }))}
                    emptyLabel="No postings in this period."
                  />
                </>
              ) : null}
            </div>
          )}
        </Panel>

        <Panel title="Professionals">
          {professionals === null ? (
            <PermissionNote />
          ) : !professionals.professionals.available ? (
            <EmptyPanel label="Professional profiles are not enabled on this installation yet." />
          ) : (
            <div className="flex flex-col gap-5">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Figure
                  label="Listed"
                  value={professionals.professionals.listed.toLocaleString()}
                />
                <Figure
                  label="Awaiting review"
                  value={professionals.professionals.awaiting_review.toLocaleString()}
                />
              </dl>

              <TrendChart
                points={professionals.professionals.series}
                title="Profile signups"
                emptyLabel="No profiles were created in this period."
              />

              <DonutChart
                slices={professionals.professionals.verification
                  .map((status, index) => ({ status, colour: ADMIN_SERIES_COLOURS[index % ADMIN_SERIES_COLOURS.length] }))
                  .filter(({ status }) => status.total > 0)
                  .map(({ status, colour }) => ({
                    label: status.label,
                    value: status.total,
                    colour,
                  }))}
                caption="Professionals by verification status"
                emptyLabel="No professional profiles yet."
              />

              <h3 className="text-xs font-semibold tracking-wide text-admin-muted uppercase">
                Highest rated
              </h3>
              <BarList
                rows={professionals.professionals.top_rated.map((row) => ({
                  label: row.business_name ?? row.name,
                  value: Math.round(row.rating_avg * 100) / 100,
                  hint:
                    row.rating_count === 0
                      ? "No ratings yet"
                      : `${row.rating_count} rating${row.rating_count === 1 ? "" : "s"}${
                          row.location ? ` · ${row.location}` : ""
                        }`,
                }))}
                emptyLabel="No professional has been rated yet."
              />

              <h3 className="text-xs font-semibold tracking-wide text-admin-muted uppercase">
                Most jobs completed
              </h3>
              <BarList
                rows={professionals.professionals.most_completed.map((row) => ({
                  label: row.business_name ?? row.name,
                  value: row.completed_jobs_count,
                  hint: row.location ?? undefined,
                }))}
                emptyLabel="No jobs have been completed yet."
              />
            </div>
          )}
        </Panel>

        <Panel title="Services">
          {services === null ? (
            <PermissionNote />
          ) : !services.services.available ? (
            <EmptyPanel label="The service catalogue is not enabled on this installation yet." />
          ) : (
            <div className="flex flex-col gap-5">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Figure
                  label="Services"
                  value={services.services.catalogue.services.toLocaleString()}
                />
                <Figure
                  label="Active"
                  value={services.services.catalogue.active_services.toLocaleString()}
                />
                <Figure
                  label="Categories"
                  value={services.services.catalogue.categories.toLocaleString()}
                />
                <Figure
                  label="Average budget"
                  value={
                    services.services.average_budget_cents === null
                      ? "—"
                      : formatCompactMoney(services.services.average_budget_cents)
                  }
                />
              </dl>

              <h3 className="text-xs font-semibold tracking-wide text-admin-muted uppercase">
                Most requested services
              </h3>
              <BarList
                rows={services.services.most_requested.map((row) => ({
                  label: row.name,
                  value: row.total,
                }))}
                emptyLabel="No services were requested in this period."
              />

              <h3 className="text-xs font-semibold tracking-wide text-admin-muted uppercase">
                Most requested categories
              </h3>
              <BarList
                rows={services.services.most_requested_categories.map((row) => ({
                  label: row.name,
                  value: row.total,
                }))}
                emptyLabel="No categories were requested in this period."
              />

              <p className="text-xs text-admin-muted">
                Revenue by service is not shown because no payment has been recorded against one
                yet.
              </p>
            </div>
          )}
        </Panel>

        <Panel
          title="Locations"
          description={
            locations ? `${locations.locations.total_covered} towns with activity` : undefined
          }
        >
          {locations === null ? (
            <PermissionNote />
          ) : !locations.locations.available ? (
            <EmptyPanel label="Location records are not enabled on this installation yet." />
          ) : (
            <div className="flex flex-col gap-5">
              <h3 className="text-xs font-semibold tracking-wide text-admin-muted uppercase">
                Requests by town
              </h3>
              <BarList
                rows={locations.locations.demand.map((row) => ({
                  label: row.name,
                  value: row.requests,
                  hint: `${row.professionals} professional${row.professionals === 1 ? "" : "s"} based here`,
                }))}
                emptyLabel="No requests were posted in this period."
              />

              {/*
                A coordinate list rather than a map. The towns the platform
                covers do carry coordinates and a real map could be drawn from
                them, but the panel's job here — which town has demand and
                whether anyone covers it — is answered by the ranking above.
              */}
              <p className="text-xs text-admin-muted">
                Coordinates are held for every town; a plotted map is not part of this console yet.
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Activity and health ────────────────────────────────────────── */}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Recent activity"
          description="The last dozen things that happened on the platform."
        >
          {dashboard.activity.length === 0 ? (
            <EmptyPanel label="Nothing has happened yet." />
          ) : (
            <ol className="flex flex-col gap-4">
              {dashboard.activity.map((event, index) => (
                <li key={`${event.type}-${event.at}-${index}`} className="flex gap-3">
                  <ToneDot tone={event.tone} />
                  <div className="min-w-0">
                    <p className="text-sm">
                      {event.href ? (
                        <Link href={event.href} className="font-medium hover:text-admin-accent">
                          {event.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{event.title}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-admin-muted">{event.description}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">{formatRelative(event.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel
            title="System health"
            description="Reported from the application's own checks, not from a stored figure."
            action={
              <Pill tone={healthTone(dashboard.system_health_overall)}>
                {healthLabel(dashboard.system_health_overall)}
              </Pill>
            }
          >
            <ul className="divide-y divide-admin-border">
              {dashboard.system_health.map((line) => (
                <li key={line.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{line.label}</p>
                    <p className="mt-0.5 text-xs text-admin-muted">{line.detail}</p>
                  </div>
                  <Pill tone={healthTone(line.status)}>{healthLabel(line.status)}</Pill>
                </li>
              ))}
            </ul>

            {/*
              The features that are not built yet, named as such. The overall
              verdict ignores them — a service nobody has configured is neither
              working nor broken — so this list is where they are visible.
            */}
            <NotYetAvailable availability={dashboard.availability} />
          </Panel>
        </div>
      </div>

      {/* ── Recent rows ────────────────────────────────────────────────── */}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Recent bookings"
          description="The five most recently created."
          bodyClassName=""
          action={<SeeAll href="/admin/bookings" permission="view_bookings" granted={granted} />}
        >
          {recentBookings === null ? (
            <div className="px-5 py-5">
              <PermissionNote />
            </div>
          ) : recentBookings.data.length === 0 ? (
            <div className="px-5 py-5">
              <EmptyPanel label="No bookings yet." />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Reference</TH>
                  <TH>Status</TH>
                  <TH className="hidden sm:table-cell">Scheduled</TH>
                  <TH className="text-right">Value</TH>
                </TR>
              </THead>
              <TBody>
                {recentBookings.data.map((booking) => (
                  <TR key={booking.id}>
                    <TD>
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="font-medium hover:text-admin-accent"
                      >
                        {booking.reference}
                      </Link>
                      <p className="text-xs text-admin-muted">{booking.title}</p>
                    </TD>
                    <TD>
                      <Pill tone={statusPillTone(booking.status)}>{booking.status_label}</Pill>
                    </TD>
                    <TD className="hidden text-xs text-admin-muted sm:table-cell">
                      {booking.scheduled_for ? formatDate(booking.scheduled_for) : "Not scheduled"}
                    </TD>
                    <TD className="text-right tabular-nums">{formatMoney(booking.total_cents)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>

        <Panel
          title="Recent users"
          description="The five most recently registered accounts."
          bodyClassName=""
          action={<SeeAll href="/admin/users" permission="view_users" granted={granted} />}
        >
          {recentUsers === null ? (
            <div className="px-5 py-5">
              <PermissionNote />
            </div>
          ) : recentUsers.data.length === 0 ? (
            <div className="px-5 py-5">
              <EmptyPanel label="No accounts yet." />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Account</TH>
                  <TH>Role</TH>
                  <TH className="hidden sm:table-cell">Joined</TH>
                </TR>
              </THead>
              <TBody>
                {recentUsers.data.map((user) => (
                  <TR key={user.id}>
                    <TD>
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-medium hover:text-admin-accent"
                      >
                        {user.name}
                      </Link>
                      <p className="text-xs text-admin-muted">{user.email}</p>
                    </TD>
                    <TD>
                      <Pill tone={user.status === "active" ? "neutral" : statusPillTone(user.status)}>
                        {user.role ?? "No role"}
                      </Pill>
                    </TD>
                    <TD className="hidden text-xs text-admin-muted sm:table-cell">
                      {formatDate(user.created_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>

        <Panel
          title="Recent professionals"
          description="The five most recently created profiles."
          bodyClassName=""
          action={
            <SeeAll
              href="/admin/professionals"
              permission="view_professionals"
              granted={granted}
            />
          }
        >
          {recentProfessionals === null ? (
            <div className="px-5 py-5">
              <PermissionNote />
            </div>
          ) : recentProfessionals.data.length === 0 ? (
            <div className="px-5 py-5">
              <EmptyPanel label="No professional profiles yet." />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Professional</TH>
                  <TH>Verification</TH>
                  <TH className="hidden text-right sm:table-cell">Rating</TH>
                </TR>
              </THead>
              <TBody>
                {recentProfessionals.data.map((professional) => (
                  <TR key={professional.id}>
                    <TD>
                      <Link
                        href={`/admin/professionals/${professional.id}`}
                        className="font-medium hover:text-admin-accent"
                      >
                        {professional.business_name ?? professional.user?.name ?? `#${professional.id}`}
                      </Link>
                      <p className="text-xs text-admin-muted">
                        {professional.base_location?.name ?? "No base location"}
                      </p>
                    </TD>
                    <TD>
                      <Pill tone={professional.is_verified ? "success" : "warning"}>
                        {professional.verification_label}
                      </Pill>
                    </TD>
                    <TD className="hidden text-right text-xs tabular-nums sm:table-cell">
                      {professional.rating_count === 0
                        ? "No ratings"
                        : `${professional.rating_avg} (${professional.rating_count})`}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>

        {/*
          Payments has no endpoint and no table yet, so there is nothing to list
          and no honest way to list it. The panel says so rather than standing in
          for a feature with an empty table.
        */}
        <UnavailablePanel title="Recent payments" reason={revenueReason} />
      </div>

      {/* ── Quick actions ──────────────────────────────────────────────── */}

      <QuickActions granted={granted} />
    </div>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

/** A count and a way to go and deal with it. */
function PendingCard({ action }: { action: PendingAction }) {
  const tone = action.tone === "danger" ? "danger" : action.tone === "warning" ? "warning" : "accent";

  return (
    <Link
      href={action.href}
      className="flex h-full flex-col gap-1 rounded-lg border border-admin-border bg-admin-bg px-4 py-3 transition-colors hover:border-admin-accent"
    >
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{action.count}</span>
      <span className="text-sm font-medium">{action.label}</span>
      <span className="mt-auto pt-1">
        <Pill tone={tone}>{action.action}</Pill>
      </span>
    </Link>
  );
}

/** One revenue figure, with the previous period beside it when there is one. */
function RevenueFigure({
  label,
  value,
  previous,
}: {
  label: string;
  value: number;
  previous: number | null;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-admin-muted uppercase">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
        {formatMoney(value)}
      </dd>
      {previous !== null ? (
        <p className="mt-0.5 text-xs text-admin-muted">
          {formatMoney(previous)} in the period before
        </p>
      ) : null}
    </div>
  );
}

/** Shown when a panel's endpoint is behind a permission this account lacks. */
function PermissionNote() {
  return (
    <p className="rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-4 text-sm text-admin-muted">
      Not shown — this panel reads the analytics endpoints, which your account may not open. An
      administrator with <span className="font-medium">view_analytics</span> can grant it.
    </p>
  );
}

/** The "see all" link, present only when the destination is reachable. */
function SeeAll({
  href,
  permission,
  granted,
}: {
  href: string;
  permission: AdminPermission;
  granted: readonly string[];
}) {
  if (!can(granted, permission)) return null;

  return (
    <Link
      href={href}
      className="text-xs font-medium text-admin-accent transition-colors hover:underline"
    >
      See all
    </Link>
  );
}

/**
 * The features that are not built yet.
 *
 * Laravel reports each one as a boolean, and the health panel deliberately
 * excludes them from its verdict — so without this list a console could look
 * entirely healthy while four of its sections do not exist.
 */
function NotYetAvailable({ availability }: { availability: Availability }) {
  const missing = Object.entries(availability).filter(([, enabled]) => !enabled);

  if (missing.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-3">
      <p className="text-xs font-medium">Not enabled on this installation</p>
      <p className="mt-1 text-xs text-admin-muted">
        {missing.map(([feature]) => FEATURE_LABELS[feature] ?? feature).join(", ")}. These have no
        tables behind them yet, so their panels report nothing rather than zero.
      </p>
    </div>
  );
}

const FEATURE_LABELS: Record<string, string> = {
  payments: "Payments",
  reviews: "Reviews",
  complaints: "Complaints",
  messaging: "Messaging",
  bookings: "Bookings",
  quotations: "Quotations",
  notifications: "Notifications",
};

/** The shortcuts, filtered to the doors this administrator can open. */
function QuickActions({ granted }: { granted: readonly string[] }) {
  const allowed = QUICK_ACTIONS.filter((action) => can(granted, action.permission));

  if (allowed.length === 0) return null;

  return (
    <Panel title="Quick actions" description="The things an administrator reaches for most.">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {allowed.map((action) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className="flex h-full flex-col rounded-lg border border-admin-border px-4 py-3 transition-colors hover:border-admin-accent hover:bg-admin-surface/50"
            >
              <span className="text-sm font-medium">{action.label}</span>
              <span className="mt-1 text-xs text-admin-muted">{action.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
