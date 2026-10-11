import type { Metadata } from "next";
import Link from "next/link";
import { BarList, DonutChart, StackedColumns, TrendChart } from "@/components/admin/charts";
import {
  EmptyPanel,
  Figure,
  LinkChip,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
  UnavailablePanel,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  ADMIN_SERIES_COLOURS,
  QUICK_RANGES,
  RANGE_LABELS,
  asDateInput,
  can,
  consoleHref,
  type AdminRange,
  type BookingAnalytics,
  type LocationAnalytics,
  type ProfessionalAnalytics,
  type RevenuePayload,
  type ServiceAnalytics,
  type UserAnalytics,
} from "@/lib/admin";
import { currentAdmin, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatCompactMoney, formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };

/*
 * The drill-down analytics screen (spec §20).
 *
 * The dashboard answers "how is the platform doing"; this answers "show me the
 * working". It reads the same six endpoints and puts the detail the dashboard
 * has no room for beside each chart — every status with its counts, every
 * ranked professional with a link to their file, every town with its demand and
 * its supply side by side.
 *
 * All six endpoints sit behind one permission (`view_analytics`), so the gate is
 * a single check rather than six. Each section still handles its own
 * `available: false` separately, because the tables behind them come online
 * independently: payments can be live while complaints are not.
 */

/** One period's bucket on the revenue chart, named the way the switcher names it. */
const REVENUE_SCOPES = [
  { key: "today", label: "Today" },
  { key: "last_7_days", label: "Last 7 days" },
  { key: "last_30_days", label: "Last 30 days" },
  { key: "this_year", label: "This year" },
] as const;

export default async function AdminAnalyticsPage(props: PageProps<"/admin/analytics">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_analytics")) {
    return <NoAccess permission="view_analytics" />;
  }

  const params = await props.searchParams;
  const range = one(params.range);
  const from = one(params.from);
  const to = one(params.to);

  /*
   * Revenue carries its own window, like the dashboard's panel does. The other
   * five sections share the page's filter, so one period selection moves the
   * whole screen and the revenue chart says separately which window it drew.
   */
  const revenueScope =
    REVENUE_SCOPES.find((scope) => scope.key === one(params.revenue)) ?? REVENUE_SCOPES[2];

  const token = session.token;
  const search = { range, from, to };

  const [revenue, bookings, users, professionals, services, locations] = await Promise.all([
    apiFetch<{ range: AdminRange; revenue: RevenuePayload }>("/admin/revenue", {
      token,
      search: { range: revenueScope.key },
    }),
    apiFetch<{ range: AdminRange; bookings: BookingAnalytics }>("/admin/bookings/analytics", {
      token,
      search,
    }),
    apiFetch<{ range: AdminRange; users: UserAnalytics }>("/admin/users/analytics", {
      token,
      search,
    }),
    apiFetch<{ range: AdminRange; professionals: ProfessionalAnalytics }>(
      "/admin/professionals/analytics",
      { token, search },
    ),
    apiFetch<{ range: AdminRange; services: ServiceAnalytics }>("/admin/services/analytics", {
      token,
      search,
    }),
    apiFetch<{ range: AdminRange; locations: LocationAnalytics }>("/admin/locations/analytics", {
      token,
      search,
    }),
  ]);

  // Every section resolves its own window from the same parameters, so any one
  // of them names the period the others describe.
  const activeRange = bookings.range;
  const windowLabel = `${formatDate(activeRange.from)} – ${formatDate(activeRange.to)}`;
  const revenueReason =
    revenue.revenue.reason ?? "Payments are not enabled on this installation yet.";

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            Every figure below is computed by the API for the window shown — {windowLabel},{" "}
            {activeRange.days} {activeRange.days === 1 ? "day" : "days"}, bucketed by{" "}
            {activeRange.granularity}. Nothing on this page is estimated, and a section whose
            records do not exist yet says so rather than reporting zero.
          </>
        }
      />

      {/* ── The window ─────────────────────────────────────────────────── */}

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_RANGES.map((preset) => (
          <LinkChip
            key={preset}
            href={consoleHref("/admin/analytics", { range: preset })}
            active={activeRange.preset === preset}
          >
            {RANGE_LABELS[preset]}
          </LinkChip>
        ))}

        <form method="get" action="/admin/analytics" className="ml-auto flex flex-wrap items-end gap-2">
          <input type="hidden" name="range" value="custom" />

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

      {/* ── Revenue ────────────────────────────────────────────────────── */}

      {!revenue.revenue.available ? (
        <UnavailablePanel title="Revenue" reason={revenueReason} />
      ) : (
        <Panel
          title="Revenue"
          description={`${RANGE_LABELS[revenueScope.key]} · ${formatDate(revenue.range.from)} – ${formatDate(revenue.range.to)} · bucketed by ${revenue.range.granularity}`}
          action={
            <div className="flex flex-wrap gap-1.5">
              {REVENUE_SCOPES.map((scope) => (
                <LinkChip
                  key={scope.key}
                  href={consoleHref("/admin/analytics", {
                    range,
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
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
              <Figure
                label="In this period"
                value={formatMoney(revenue.revenue.totals?.period_cents ?? 0)}
                hint={`${formatMoney(revenue.revenue.totals?.previous_period_cents ?? 0)} the period before`}
              />
              <Figure
                label="Today"
                value={formatMoney(revenue.revenue.totals?.today_cents ?? 0)}
              />
              <Figure
                label="This week"
                value={formatMoney(revenue.revenue.totals?.week_cents ?? 0)}
              />
              <Figure
                label="This month"
                value={formatMoney(revenue.revenue.totals?.month_cents ?? 0)}
              />
              <Figure
                label="This year"
                value={formatMoney(revenue.revenue.totals?.year_cents ?? 0)}
              />
              <Figure
                label="All time"
                value={formatMoney(revenue.revenue.totals?.all_time_cents ?? 0)}
              />
              <Figure
                label="Refunded"
                value={formatMoney(revenue.revenue.totals?.refunded_cents ?? 0)}
                hint="All time"
              />
            </dl>

            <TrendChart
              points={revenue.revenue.series}
              format="money"
              title="Revenue collected"
              height={240}
              emptyLabel="No payment was collected in this period."
            />

            <p className="text-xs text-admin-muted">
              Only settled payments count. A payment appears here once the gateway — or an
              administrator confirming a cash or bank transfer — has marked it paid, never because a
              customer said so.
            </p>
          </div>
        </Panel>
      )}

      {/* ── Bookings ───────────────────────────────────────────────────── */}

      {!bookings.bookings.available ? (
        <UnavailablePanel
          title="Bookings"
          reason={
            bookings.bookings.reason ?? "Booking records are not enabled on this installation yet."
          }
        />
      ) : (
        <Panel
          title="Bookings"
          description={`${bookings.bookings.in_period.toLocaleString()} created in this window, ${bookings.bookings.previous_period.toLocaleString()} in the one before`}
        >
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <Figure label="All time" value={bookings.bookings.total.toLocaleString()} />
              <Figure label="In this window" value={bookings.bookings.in_period.toLocaleString()} />
              <Figure
                label="Previous window"
                value={bookings.bookings.previous_period.toLocaleString()}
              />
              <Figure
                label="Completion"
                value={
                  bookings.bookings.completion_rate === null
                    ? "—"
                    : `${bookings.bookings.completion_rate}%`
                }
                hint="Of bookings created in this window"
              />
              <Figure
                label="Cancellation"
                value={
                  bookings.bookings.cancellation_rate === null
                    ? "—"
                    : `${bookings.bookings.cancellation_rate}%`
                }
                hint="Of bookings created in this window"
              />
            </dl>

            <TrendChart
              points={bookings.bookings.series}
              title="Bookings created"
              height={220}
              emptyLabel="No bookings were created in this period."
            />

            {bookings.bookings.status_series.length > 0 ? (
              <StackedColumns
                points={bookings.bookings.status_series}
                keys={[
                  { key: "pending", label: "Awaiting response", colour: ADMIN_SERIES_COLOURS[0] },
                  { key: "quoted", label: "Price sent", colour: ADMIN_SERIES_COLOURS[1] },
                  { key: "accepted", label: "Accepted", colour: ADMIN_SERIES_COLOURS[2] },
                  { key: "scheduled", label: "Scheduled", colour: ADMIN_SERIES_COLOURS[3] },
                  { key: "on_the_way", label: "On the way", colour: ADMIN_SERIES_COLOURS[4] },
                  { key: "in_progress", label: "In progress", colour: ADMIN_SERIES_COLOURS[5] },
                ]}
                title="Bookings by status"
                height={220}
                emptyLabel="No bookings were created in this period."
              />
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-admin-muted uppercase">
                  Every status
                </h3>
                <Table>
                  <THead>
                    <TR>
                      <TH>Status</TH>
                      <TH className="text-right">In window</TH>
                      <TH className="text-right">All time</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {bookings.bookings.statuses.map((status) => (
                      <TR key={status.value}>
                        <TD>
                          <Link
                            href={`/admin/bookings?status=${status.value}`}
                            className="font-medium hover:text-admin-accent"
                          >
                            {status.label}
                          </Link>
                        </TD>
                        <TD className="text-right tabular-nums">
                          {status.in_period.toLocaleString()}
                        </TD>
                        <TD className="text-right tabular-nums text-admin-muted">
                          {status.total.toLocaleString()}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              <DonutChart
                slices={bookings.bookings.statuses
                  .filter((status) => status.total > 0)
                  .map((status, index) => ({
                    label: status.label,
                    value: status.total,
                    colour: ADMIN_SERIES_COLOURS[index % ADMIN_SERIES_COLOURS.length],
                  }))}
                caption="Bookings by status, all time"
                emptyLabel="No bookings have been recorded yet."
              />
            </div>
          </div>
        </Panel>
      )}

      {/* ── Users ──────────────────────────────────────────────────────── */}

      <Panel title="Users" description="Accounts, their roles, and where they are posting from.">
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
            <Figure label="Customers" value={users.users.roles.customers.toLocaleString()} />
            <Figure label="Professionals" value={users.users.roles.professionals.toLocaleString()} />
            <Figure
              label="Administrators"
              value={users.users.roles.administrators.toLocaleString()}
            />
            <Figure label="Suspended" value={users.users.statuses.suspended.toLocaleString()} />
            <Figure
              label="Registered here"
              value={users.users.new_in_period.toLocaleString()}
              hint={`${users.users.new_previous_period.toLocaleString()} in the window before`}
            />
            <Figure
              label="Active accounts"
              value={users.users.statuses.active.toLocaleString()}
            />
          </dl>

          <TrendChart
            points={users.users.series}
            title="Registrations"
            height={220}
            emptyLabel="Nobody registered in this period."
          />

          <StackedColumns
            points={users.users.series_by_role}
            keys={[
              { key: "customer", label: "Customers", colour: ADMIN_SERIES_COLOURS[0] },
              { key: "professional", label: "Professionals", colour: ADMIN_SERIES_COLOURS[1] },
            ]}
            title="Registrations by role"
            height={220}
            emptyLabel="Nobody registered in this period."
          />

          <div>
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-admin-muted uppercase">
              Where customers are posting from
            </h3>
            <BarList
              rows={users.users.registrations_by_location.map((row) => ({
                label: row.name,
                value: row.total,
              }))}
              emptyLabel="No job was posted in this period."
            />
            <p className="mt-3 text-xs text-admin-muted">
              A customer account holds no town of its own — the address belongs to the job posting —
              so this counts the towns their postings were made in.
            </p>
          </div>
        </div>
      </Panel>

      {/* ── Professionals ──────────────────────────────────────────────── */}

      {!professionals.professionals.available ? (
        <UnavailablePanel
          title="Professionals"
          reason={
            professionals.professionals.reason ??
            "Professional profiles are not enabled on this installation yet."
          }
        />
      ) : (
        <Panel
          title="Professionals"
          description={`${professionals.professionals.listed.toLocaleString()} verified, ${professionals.professionals.awaiting_review.toLocaleString()} awaiting review`}
        >
          <div className="flex flex-col gap-5">
            <TrendChart
              points={professionals.professionals.series}
              title="Profiles created"
              height={220}
              emptyLabel="No professional profile was created in this period."
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <DonutChart
                slices={professionals.professionals.verification
                  .filter((status) => status.total > 0)
                  .map((status, index) => ({
                    label: status.label,
                    value: status.total,
                    colour: ADMIN_SERIES_COLOURS[index % ADMIN_SERIES_COLOURS.length],
                  }))}
                caption="Professionals by verification status"
                emptyLabel="No professional profiles yet."
              />

              <div className="flex flex-col gap-4">
                {professionals.professionals.awaiting_review > 0 ? (
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-admin-border bg-admin-surface/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Awaiting review</p>
                      <p className="mt-0.5 text-xs text-admin-muted">
                        Applications waiting on a decision.
                      </p>
                    </div>
                    <Link
                      href="/admin/verification"
                      className="shrink-0 text-xs font-medium text-admin-accent hover:underline"
                    >
                      Open the queue
                    </Link>
                  </div>
                ) : (
                  <EmptyPanel label="No application is waiting on a decision." />
                )}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-admin-muted uppercase">
                  Highest rated
                </h3>
                {professionals.professionals.top_rated.length === 0 ? (
                  <EmptyPanel label="No verified professional has been rated yet." />
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Professional</TH>
                        <TH className="text-right">Rating</TH>
                        <TH className="hidden text-right sm:table-cell">Ratings</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {professionals.professionals.top_rated.map((row) => (
                        <TR key={row.id}>
                          <TD>
                            <Link
                              href={`/admin/professionals/${row.id}`}
                              className="font-medium hover:text-admin-accent"
                            >
                              {row.business_name ?? row.name}
                            </Link>
                            {row.location ? (
                              <p className="text-xs text-admin-muted">{row.location}</p>
                            ) : null}
                          </TD>
                          <TD className="text-right tabular-nums">{row.rating_avg}</TD>
                          <TD className="hidden text-right tabular-nums text-admin-muted sm:table-cell">
                            {row.rating_count}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-admin-muted uppercase">
                  Most jobs completed
                </h3>
                {professionals.professionals.most_completed.length === 0 ? (
                  <EmptyPanel label="No job has been completed yet." />
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Professional</TH>
                        <TH className="text-right">Completed</TH>
                        <TH className="hidden text-right sm:table-cell">Rating</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {professionals.professionals.most_completed.map((row) => (
                        <TR key={row.id}>
                          <TD>
                            <Link
                              href={`/admin/professionals/${row.id}`}
                              className="font-medium hover:text-admin-accent"
                            >
                              {row.business_name ?? row.name}
                            </Link>
                            {row.location ? (
                              <p className="text-xs text-admin-muted">{row.location}</p>
                            ) : null}
                          </TD>
                          <TD className="text-right tabular-nums">{row.completed_jobs_count}</TD>
                          <TD className="hidden text-right tabular-nums text-admin-muted sm:table-cell">
                            {row.rating_count === 0 ? "—" : row.rating_avg}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* ── Services ───────────────────────────────────────────────────── */}

      {!services.services.available ? (
        <UnavailablePanel
          title="Services"
          reason={
            services.services.reason ?? "The service catalogue is not enabled on this installation yet."
          }
        />
      ) : (
        <Panel
          title="Services"
          description="Demand is counted from job postings, not from what professionals advertise."
        >
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Figure
                label="Services"
                value={services.services.catalogue.services.toLocaleString()}
              />
              <Figure
                label="Active"
                value={services.services.catalogue.active_services.toLocaleString()}
                hint="Visible in the public catalogue"
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
                hint="Upper end of the budgets posted here"
              />
            </dl>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-admin-muted uppercase">
                  Most requested services
                </h3>
                <BarList
                  rows={services.services.most_requested.map((row) => ({
                    label: row.name,
                    value: row.total,
                  }))}
                  emptyLabel="No service was requested in this period."
                />
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-admin-muted uppercase">
                  Most requested categories
                </h3>
                <BarList
                  rows={services.services.most_requested_categories.map((row) => ({
                    label: row.name,
                    value: row.total,
                  }))}
                  emptyLabel="No category was requested in this period."
                />
              </div>
            </div>

            {!services.services.revenue_available ? (
              <p className="rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-3 text-xs text-admin-muted">
                Revenue by service is not shown because no payment has been recorded against one yet.
                The moment payments exist, this section can rank services by what they earn rather
                than only by how often they are asked for.
              </p>
            ) : null}
          </div>
        </Panel>
      )}

      {/* ── Locations ──────────────────────────────────────────────────── */}

      {!locations.locations.available ? (
        <UnavailablePanel
          title="Locations"
          reason={
            locations.locations.reason ?? "Location records are not enabled on this installation yet."
          }
        />
      ) : (
        <Panel
          title="Locations"
          description={`${locations.locations.total_covered} town${
            locations.locations.total_covered === 1 ? "" : "s"
          } switched on, ranked by demand in this window`}
          bodyClassName=""
        >
          {locations.locations.demand.length === 0 ? (
            <div className="px-5 py-5">
              <EmptyPanel label="No job was posted in this period, so no town has demand to show." />
            </div>
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>Town</TH>
                    <TH className="text-right">Requests</TH>
                    <TH className="text-right">Professionals based here</TH>
                    <TH className="hidden lg:table-cell">Coordinates</TH>
                  </TR>
                </THead>
                <TBody>
                  {locations.locations.demand.map((town) => (
                    <TR key={town.id}>
                      <TD>
                        <Link
                          href={`/admin/professionals?location_id=${town.id}`}
                          className="font-medium hover:text-admin-accent"
                        >
                          {town.name}
                        </Link>
                      </TD>
                      <TD className="text-right tabular-nums">{town.requests.toLocaleString()}</TD>
                      <TD className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-2">
                          {town.professionals.toLocaleString()}
                          {/* Demand with no supply is the interesting row, so it is marked. */}
                          {town.professionals === 0 ? <Pill tone="warning">No cover</Pill> : null}
                        </span>
                      </TD>
                      <TD className="hidden font-mono text-xs text-admin-muted lg:table-cell">
                        {town.latitude === null || town.longitude === null
                          ? "—"
                          : `${town.latitude.toFixed(4)}, ${town.longitude.toFixed(4)}`}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>

              <p className="border-t border-admin-border px-5 py-4 text-xs text-admin-muted">
                Every town on the platform carries coordinates, but this console plots no map yet —
                the ranking above answers which town has demand and whether anyone covers it, which
                is the question a map would be drawn to answer.
              </p>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
