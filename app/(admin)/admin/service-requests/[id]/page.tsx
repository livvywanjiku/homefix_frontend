import type { Metadata } from "next";
import Link from "next/link";
import { EmptyPanel, KeyValue, NoAccess, PageIntro, Panel, Pill, statusPillTone } from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import type { Item, ServiceRequest } from "@/lib/types";

export const metadata: Metadata = { title: "Service Request" };

/**
 * One job posting, as it was advertised.
 *
 * The street address and access notes are shown here because an administrator
 * is one of the two accounts the policy releases them to — the other being the
 * customer who wrote them. The professional's view deliberately omits them
 * until a quotation has been accepted, and this page does not widen that.
 *
 * The quotations are read-only. Awarding a posting happens by the customer
 * accepting an offer, which is a commercial decision the platform records
 * rather than makes on their behalf.
 */
export default async function AdminServiceRequestPage(
  props: PageProps<"/admin/service-requests/[id]">,
) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_service_requests")) {
    return <NoAccess permission="view_service_requests" />;
  }

  const { id } = await props.params;
  const { data: request } = await apiFetch<Item<ServiceRequest>>(`/admin/service-requests/${id}`, {
    token: session.token,
  });

  const quotations = request.quotations ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            <Link href="/admin/service-requests" className="hover:text-admin-accent">
              ← All service requests
            </Link>
            {request.customer?.id ? (
              <>
                {" · "}
                <Link href={`/admin/users/${request.customer.id}`} className="hover:text-admin-accent">
                  Open the customer
                </Link>
              </>
            ) : null}
          </>
        }
      >
        <Pill tone={statusPillTone(request.status)}>{request.status_label}</Pill>
        {request.urgency === "urgent" ? <Pill tone="danger">Urgent</Pill> : null}
        {request.is_expired && request.status !== "expired" ? (
          <Pill tone="danger">Past its deadline</Pill>
        ) : null}
      </PageIntro>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="The job" className="lg:col-span-2">
          <p className="text-base font-semibold">{request.title}</p>
          <p className="mt-3 text-sm whitespace-pre-line">{request.description}</p>

          {request.images && request.images.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">Photos</p>
              <ul className="mt-2 flex flex-wrap gap-3">
                {request.images.map((image) => (
                  <li key={image.id}>
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-admin-border"
                    >
                      {/* Plain <img>: the file is served by Laravel under a policy,
                          so it cannot go through the image optimiser. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.original_name ?? "Photo attached to the request"}
                        className="h-24 w-24 object-cover"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        <Panel title="Terms">
          <dl className="grid grid-cols-2 gap-4">
            <KeyValue label="Reference">{request.reference}</KeyValue>
            <KeyValue label="Posted">{formatDate(request.created_at)}</KeyValue>
            <KeyValue label="Service">{request.service?.name ?? "—"}</KeyValue>
            <KeyValue label="Location">{request.location?.label ?? "—"}</KeyValue>
            <KeyValue label="Urgency">{request.urgency_label}</KeyValue>
            <KeyValue label="Preferred date">
              {request.preferred_date ? formatDate(request.preferred_date) : "Flexible"}
              {request.preferred_time_slot_label ? (
                <span className="block text-xs text-admin-muted">
                  {request.preferred_time_slot_label}
                </span>
              ) : null}
            </KeyValue>
            <KeyValue label="Budget" className="col-span-2">
              {request.budget_min_cents === null && request.budget_max_cents === null ? (
                <span className="text-admin-muted">Not stated</span>
              ) : request.budget_max_cents === null ? (
                `From ${formatMoney(request.budget_min_cents)}`
              ) : request.budget_min_cents === null ? (
                `Up to ${formatMoney(request.budget_max_cents)}`
              ) : (
                `${formatMoney(request.budget_min_cents)} – ${formatMoney(request.budget_max_cents)}`
              )}
            </KeyValue>
            <KeyValue label="Quotations" className="col-span-2">
              {request.quotes_count}
              {request.accepts_quotations ? (
                <span className="text-admin-muted"> · still accepting offers</span>
              ) : (
                <span className="text-admin-muted"> · closed to new offers</span>
              )}
            </KeyValue>
            <KeyValue label="Deadline" className="col-span-2">
              {request.expires_at ? formatDateTime(request.expires_at) : "No deadline"}
            </KeyValue>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Where the work is">
          <dl className="grid gap-4">
            <KeyValue label="Town">{request.location?.label ?? "Not set"}</KeyValue>
            <KeyValue label="Address">
              {request.address ?? <span className="text-admin-muted">Not given</span>}
            </KeyValue>
            <KeyValue label="Access notes">
              {request.instructions ?? <span className="text-admin-muted">None</span>}
            </KeyValue>
            <KeyValue label="Coordinates">
              {request.latitude !== null && request.latitude !== undefined ? (
                `${request.latitude.toFixed(5)}, ${request.longitude?.toFixed(5) ?? "—"}`
              ) : (
                <span className="text-admin-muted">Not pinned</span>
              )}
            </KeyValue>
          </dl>
        </Panel>

        <Panel title="Posted by">
          <dl className="grid gap-4">
            <KeyValue label="Customer">
              {request.customer?.id ? (
                <Link href={`/admin/users/${request.customer.id}`} className="hover:text-admin-accent">
                  {request.customer.name}
                </Link>
              ) : (
                "—"
              )}
            </KeyValue>
          </dl>
          <p className="mt-4 text-xs text-admin-muted">
            Contact details are not carried on a posting. The platform keeps the exchange inside the
            request and messaging flows, and an administrator reading one is not a party to it.
          </p>
        </Panel>
      </div>

      <Panel
        title="Quotations received"
        description="What professionals have offered. Accepting one is the customer's decision."
        bodyClassName={quotations.length === 0 ? "px-5 py-5" : ""}
      >
        {quotations.length === 0 ? (
          <EmptyPanel label="No professional has quoted on this posting yet." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Professional</TH>
                <TH>Reference</TH>
                <TH>Total</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Valid until</TH>
                <TH className="hidden lg:table-cell">Sent</TH>
              </TR>
            </THead>
            <TBody>
              {quotations.map((quotation) => (
                <TR key={quotation.id}>
                  <TD>
                    <span className="font-medium">
                      {quotation.professional?.business_name ?? quotation.professional?.name ?? "—"}
                    </span>
                    {quotation.professional?.rating_count ? (
                      <p className="text-xs text-admin-muted">
                        {quotation.professional.rating_avg?.toFixed(1)} from{" "}
                        {quotation.professional.rating_count} ratings
                      </p>
                    ) : null}
                  </TD>
                  <TD className="text-xs">{quotation.reference}</TD>
                  <TD className="tabular-nums">{formatMoney(quotation.total_cents)}</TD>
                  <TD>
                    <Pill tone={statusPillTone(quotation.status)}>{quotation.status_label}</Pill>
                  </TD>
                  <TD className="hidden text-xs text-admin-muted lg:table-cell">
                    {quotation.valid_until ? formatDate(quotation.valid_until) : "No expiry"}
                  </TD>
                  <TD className="hidden text-xs text-admin-muted lg:table-cell">
                    {formatDate(quotation.created_at)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
