import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminInput,
  AdminSelect,
  EmptyPanel,
  FilterBar,
  FilterField,
  FilterSubmit,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
  statusPillTone,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  PAGE_SIZES,
  SERVICE_REQUEST_SORT_OPTIONS,
  SERVICE_REQUEST_STATUS_OPTIONS,
  can,
} from "@/lib/admin";
import { currentAdmin, filters, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import type { Collection, Location, Paginated, ServiceRequest } from "@/lib/types";

export const metadata: Metadata = { title: "Service Requests" };

/**
 * Every job posted on the platform.
 *
 * Read-only, and deliberately so — a service request is a customer's own
 * advertisement of work, and an administrator editing its terms would be
 * rewriting what a professional has been asked to price. What this screen is
 * for is volume, geography and which postings are failing to attract quotations.
 */
export default async function AdminServiceRequestsPage(props: PageProps<"/admin/service-requests">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_service_requests")) {
    return <NoAccess permission="view_service_requests" />;
  }

  const params = await props.searchParams;
  const search = filters(params, ["q", "status", "location_id", "sort", "per_page"]);
  const page = one(params.page);
  if (page) search.page = page;

  const [requests, locations] = await Promise.all([
    apiFetch<Paginated<ServiceRequest>>("/admin/service-requests", {
      token: session.token,
      search,
    }),
    apiFetch<Collection<Location>>("/locations", { token: session.token }),
  ]);

  const filtered = Object.keys(search).some((key) => key !== "page" && key !== "per_page");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {requests.meta.total.toLocaleString()} posting
            {requests.meta.total === 1 ? "" : "s"} match. A posting is an advertisement: it is
            awarded by the customer accepting a quotation, not by an administrator.
          </>
        }
      />

      <FilterBar action="/admin/service-requests">
        <FilterField label="Search" className="min-w-[14rem] flex-1">
          <AdminInput
            type="search"
            name="q"
            defaultValue={one(params.q) ?? ""}
            placeholder="Title, reference or description"
          />
        </FilterField>

        <FilterField label="Status">
          <AdminSelect name="status" defaultValue={one(params.status) ?? ""}>
            <option key="any-status" value="">Any status</option>
            {SERVICE_REQUEST_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Location">
          <AdminSelect name="location_id" defaultValue={one(params.location_id) ?? ""}>
            <option key="any-location" value="">Any location</option>
            {locations.data.map((location) => (
              <option key={location.id} value={String(location.id)}>
                {location.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Order">
          <AdminSelect name="sort" defaultValue={one(params.sort) ?? "recent"}>
            {SERVICE_REQUEST_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Per page">
          <AdminSelect name="per_page" defaultValue={one(params.per_page) ?? "25"}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterSubmit>Apply</FilterSubmit>

        {filtered ? (
          <Link
            href="/admin/service-requests"
            className="pb-2 text-xs font-medium text-admin-muted hover:text-admin-text"
          >
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Panel title="Postings" bodyClassName="">
        {requests.data.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel
              label={
                filtered ? "No posting matches those filters." : "No customer has posted a job yet."
              }
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Posting</TH>
                <TH>Status</TH>
                <TH className="hidden md:table-cell">Quotes</TH>
                <TH className="hidden lg:table-cell">Budget</TH>
                <TH className="hidden lg:table-cell">Location</TH>
                <TH className="hidden xl:table-cell">Posted</TH>
              </TR>
            </THead>
            <TBody>
              {requests.data.map((request) => (
                <TR key={request.id}>
                  <TD>
                    <Link
                      href={`/admin/service-requests/${request.id}`}
                      className="font-medium hover:text-admin-accent"
                    >
                      {request.title}
                    </Link>
                    <p className="text-xs text-admin-muted">
                      {request.reference} · {request.customer?.name ?? "Unknown customer"}
                      {request.urgency === "urgent" ? " · urgent" : ""}
                    </p>
                  </TD>
                  <TD>
                    <Pill tone={statusPillTone(request.status)}>{request.status_label}</Pill>
                    {request.is_expired && request.status !== "expired" ? (
                      <span className="mt-1 block text-xs text-danger">Past its deadline</span>
                    ) : null}
                  </TD>
                  <TD className="hidden text-xs tabular-nums md:table-cell">
                    {request.quotes_count}
                  </TD>
                  <TD className="hidden text-xs tabular-nums lg:table-cell">
                    {request.budget_min_cents === null && request.budget_max_cents === null ? (
                      <span className="text-admin-muted">Not stated</span>
                    ) : request.budget_max_cents === null ? (
                      `From ${formatMoney(request.budget_min_cents)}`
                    ) : request.budget_min_cents === null ? (
                      `Up to ${formatMoney(request.budget_max_cents)}`
                    ) : (
                      `${formatMoney(request.budget_min_cents)} – ${formatMoney(request.budget_max_cents)}`
                    )}
                  </TD>
                  <TD className="hidden text-xs text-admin-muted lg:table-cell">
                    {request.location?.name ?? "Not set"}
                  </TD>
                  <TD className="hidden text-xs text-admin-muted xl:table-cell">
                    {formatDate(request.created_at)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pagination links={paginationLinks(requests, "/admin/service-requests")} />
    </div>
  );
}
