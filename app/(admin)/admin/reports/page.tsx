import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminInput,
  AdminSelect,
  EmptyPanel,
  LinkChip,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
  UnavailablePanel,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  ACCOUNT_STATUS_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  RANGE_LABELS,
  ROLE_OPTIONS,
  SERVICE_REQUEST_STATUS_OPTIONS,
  VERIFICATION_STATUS_OPTIONS,
  asDateInput,
  can,
  consoleHref,
  type AdminReportList,
  type AdminReportPreview,
} from "@/lib/admin";
import { currentAdmin, filters, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Collection, Location, Service } from "@/lib/types";

export const metadata: Metadata = { title: "Reports" };

/*
 * The reporting interface (spec §20).
 *
 * A report is a filtered query run against the live tables, so this page is a
 * picker plus a preview plus the two ways out of the building. Nothing here is
 * pre-computed and nothing is cached: a report that answered from a snapshot
 * would be answering a different question than the one asked.
 *
 * The preview is deliberately capped by the API at 200 rows. The full set leaves
 * as a streamed CSV, because that is the format that can hold it — a browser tab
 * holding a year of bookings is not a report, it is a hang.
 */

/** Which status vocabulary applies to which report. */
const STATUS_OPTIONS: Record<string, { value: string; label: string }[]> = {
  bookings: BOOKING_STATUS_OPTIONS,
  service_requests: SERVICE_REQUEST_STATUS_OPTIONS,
  professionals: VERIFICATION_STATUS_OPTIONS,
  users: ACCOUNT_STATUS_OPTIONS,
};

export default async function AdminReportsPage(props: PageProps<"/admin/reports">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_reports")) {
    return <NoAccess permission="view_reports" />;
  }

  const params = await props.searchParams;
  const token = session.token;

  const menu = await apiFetch<AdminReportList>("/admin/reports", { token });

  // The first report the installation can actually run, so an administrator
  // landing on the screen is shown something rather than an empty frame.
  const selected =
    menu.reports.find((entry) => entry.key === one(params.report) && entry.available) ??
    menu.reports.find((entry) => entry.available) ??
    null;

  const mayExport = can(account.permissions, "export_reports");

  const range = one(params.range);
  const from = one(params.from);
  const to = one(params.to);

  const preview = selected
    ? await apiFetch<AdminReportPreview>(`/admin/reports/${selected.key}`, {
        token,
        search: filters(params, ["range", "from", "to", "status", "role", "service_id", "location_id"]),
      })
    : null;

  // The pickers are only fetched for the reports whose definitions ask for
  // them, so opening the users report does not read the catalogue.
  const needsCatalogue = selected?.filters.some((filter) =>
    ["service", "location"].includes(filter),
  );

  const [services, locations] = needsCatalogue
    ? await Promise.all([
        apiFetch<Collection<Service>>("/services", { token }),
        apiFetch<Collection<Location>>("/locations", { token }),
      ])
    : [null, null];

  const exportQuery = new URLSearchParams(
    filters(params, ["range", "from", "to", "status", "role", "service_id", "location_id"]),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            Reports are run against the live tables with the filters you choose. The preview below
            shows the first {preview?.preview_limit ?? 200} rows
            {preview?.truncated ? " and says so when there are more" : ""}; the CSV carries every
            row, and the print view is what a PDF is made from.
          </>
        }
      />

      {/* ── Which report ───────────────────────────────────────────────── */}

      <Panel title="Choose a report" bodyClassName="px-5 py-5">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {menu.reports.map((entry) => (
            <li key={entry.key}>
              {entry.available ? (
                <Link
                  href={consoleHref("/admin/reports", {
                    report: entry.key,
                    range,
                    from,
                    to,
                  })}
                  aria-current={selected?.key === entry.key ? "true" : undefined}
                  className={`flex h-full flex-col rounded-lg border px-4 py-3 transition-colors ${
                    selected?.key === entry.key
                      ? "border-admin-accent bg-admin-accent-soft"
                      : "border-admin-border hover:border-admin-accent hover:bg-admin-surface/50"
                  }`}
                >
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="mt-1 text-xs text-admin-muted">{entry.description}</span>
                </Link>
              ) : (
                /*
                 * Listed rather than hidden, so the console says which reports
                 * it would offer once their tables exist instead of quietly
                 * having fewer than the specification describes.
                 */
                <div className="flex h-full flex-col rounded-lg border border-dashed border-admin-border px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-admin-muted">
                    {entry.label}
                    <Pill tone="neutral">Not enabled</Pill>
                  </span>
                  <span className="mt-1 text-xs text-admin-muted">{entry.description}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      {selected === null || preview === null ? (
        <UnavailablePanel
          title="Report"
          reason="None of the reports this installation offers can run yet, because the tables behind them do not exist."
        />
      ) : (
        <>
          {/* ── Filters ──────────────────────────────────────────────── */}

          <form
            method="get"
            action="/admin/reports"
            className="flex flex-wrap items-end gap-3 rounded-xl border border-admin-border bg-admin-card px-4 py-3 shadow-sm"
          >
            <input type="hidden" name="report" value={selected.key} />

            <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
              Period
              <AdminSelect name="range" defaultValue={range ?? "last_30_days"}>
                {menu.ranges
                  .filter((preset) => preset !== "custom")
                  .map((preset) => (
                    <option key={preset} value={preset}>
                      {RANGE_LABELS[preset] ?? preset}
                    </option>
                  ))}
                <option value="custom">Custom</option>
              </AdminSelect>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
              From
              <AdminInput
                type="date"
                name="from"
                defaultValue={asDateInput(preview.range.from)}
                className="w-auto"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
              To
              <AdminInput
                type="date"
                name="to"
                defaultValue={asDateInput(preview.range.to)}
                className="w-auto"
              />
            </label>

            {selected.filters.includes("status") ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
                Status
                <AdminSelect name="status" defaultValue={one(params.status) ?? ""}>
                  <option value="">Any status</option>
                  {(STATUS_OPTIONS[selected.key] ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </label>
            ) : null}

            {selected.key === "users" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
                Role
                <AdminSelect name="role" defaultValue={one(params.role) ?? ""}>
                  <option value="">Any role</option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </label>
            ) : null}

            {selected.filters.includes("service") && services ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
                Service
                <AdminSelect name="service_id" defaultValue={one(params.service_id) ?? ""}>
                  <option value="">Any service</option>
                  {services.data.map((service) => (
                    <option key={service.id} value={String(service.id)}>
                      {service.name}
                    </option>
                  ))}
                </AdminSelect>
              </label>
            ) : null}

            {selected.filters.includes("location") && locations ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
                Location
                <AdminSelect name="location_id" defaultValue={one(params.location_id) ?? ""}>
                  <option value="">Any location</option>
                  {locations.data.map((location) => (
                    <option key={location.id} value={String(location.id)}>
                      {location.name}
                    </option>
                  ))}
                </AdminSelect>
              </label>
            ) : null}

            <button
              type="submit"
              className="rounded-md bg-admin-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-admin-secondary"
            >
              Run report
            </button>

            <Link
              href={`/admin/reports?report=${selected.key}`}
              className="pb-2 text-xs font-medium text-admin-muted hover:text-admin-text"
            >
              Clear
            </Link>
          </form>

          {/* ── The preview ──────────────────────────────────────────── */}

          <Panel
            title={preview.label}
            description={`${formatDate(preview.range.from)} – ${formatDate(preview.range.to)} · ${preview.rows.length} row${
              preview.rows.length === 1 ? "" : "s"
            }${preview.truncated ? ` shown, of more` : ""}`}
            bodyClassName=""
            action={
              <div className="flex flex-wrap items-center gap-2">
                {mayExport ? (
                  <>
                    <a
                      href={`/admin/reports/export?report=${selected.key}&format=csv&${exportQuery.toString()}`}
                      className="rounded-md border border-admin-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-admin-surface"
                    >
                      Download CSV
                    </a>
                    <a
                      href={`/admin/reports/export?report=${selected.key}&format=print&${exportQuery.toString()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-admin-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-admin-surface"
                    >
                      Print / save as PDF
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-admin-muted">
                    Downloading requires export_reports
                  </span>
                )}
              </div>
            }
          >
            {preview.rows.length === 0 ? (
              <div className="px-5 py-5">
                <EmptyPanel label="No row matches those filters in this period." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      {preview.columns.map((column) => (
                        <TH key={column.key}>{column.label}</TH>
                      ))}
                    </TR>
                  </THead>
                  <TBody>
                    {preview.rows.map((row, index) => (
                      <TR key={index}>
                        {preview.columns.map((column) => (
                          <TD key={column.key} className="whitespace-nowrap">
                            {row[column.key] === null || row[column.key] === undefined ? (
                              <span className="text-admin-muted">—</span>
                            ) : (
                              String(row[column.key])
                            )}
                          </TD>
                        ))}
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Panel>

          {preview.truncated ? (
            <p className="text-xs text-admin-muted">
              The preview stops at {preview.preview_limit} rows. The CSV export is not capped — it
              walks the whole result set, so nothing is lost by the limit shown here.
            </p>
          ) : null}

          {/* ── The other periods, at a glance ───────────────────────── */}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-admin-muted">Quick periods</span>
            {menu.ranges
              .filter((preset) => preset !== "custom")
              .map((preset) => (
                <LinkChip
                  key={preset}
                  href={consoleHref("/admin/reports", {
                    report: selected.key,
                    range: preset,
                    status: one(params.status),
                    role: one(params.role),
                    service_id: one(params.service_id),
                    location_id: one(params.location_id),
                  })}
                  active={preview.range.preset === preset}
                >
                  {RANGE_LABELS[preset] ?? preset}
                </LinkChip>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
