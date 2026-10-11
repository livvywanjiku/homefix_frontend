import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getServiceRequest } from "@/lib/requests";
import type { ServiceRequest } from "@/lib/types";
import { AddPhotosForm, CancelRequestForm, DeleteImageButton } from "../request-actions";

type Props = PageProps<"/dashboard/requests/[id]">;

export const metadata: Metadata = { title: "Request" };

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * One job, as its owner sees it (spec §8).
 *
 * The address, the access notes and the photos are all present here and absent
 * from the professional board — the API decides that, not this page, so the
 * difference cannot drift.
 */
export default async function RequestDetailPage({ params, searchParams }: Props) {
  const session = await requireRole("customer");

  const { id } = await params;
  const query = await searchParams;

  let request: ServiceRequest;

  try {
    request = await getServiceRequest(session.token, id);
  } catch (error) {
    /*
     * A request that is not ours answers 403 and one that does not exist answers
     * 404. Both are "no such page" to the customer — collapsing them keeps the
     * detail route from confirming which ids exist.
     */
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }

    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/dashboard/requests" className="hover:text-foreground hover:underline">
          My requests
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-foreground">{request.reference}</span>
      </nav>

      {single(query.posted) ? (
        <FormMessage tone="success">
          Your job is live. Professionals covering {request.location?.label ?? "your area"} can
          see it on their board now.
        </FormMessage>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
            <StatusBadge status={request.status} />
            {request.is_expired ? <Badge tone="danger">Expired</Badge> : null}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {request.reference} · posted {formatDateTime(request.created_at)}
            {request.service ? ` · ${request.service.name}` : ""}
          </p>
        </div>

        {request.is_editable ? (
          <ButtonLink href={`/dashboard/requests/${request.id}/edit`} variant="secondary">
            Edit
          </ButtonLink>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">The job</h2>

            <p className="mt-3 text-sm leading-6 whitespace-pre-line text-muted-foreground">
              {request.description}
            </p>
          </Card>

          {request.images && request.images.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-semibold tracking-tight">Photos</h2>

              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {request.images.map((image) => (
                  <li key={image.id} className="flex flex-col gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- storage-served thumbnails */}
                    <img
                      src={image.url}
                      alt={image.original_name ?? "Photo of the job"}
                      className="h-28 w-full rounded-lg border border-line object-cover"
                    />

                    {request.is_editable ? (
                      <DeleteImageButton requestId={request.id} image={image} />
                    ) : null}
                  </li>
                ))}
              </ul>

              {request.is_editable ? (
                <div className="mt-5 border-t border-line pt-4">
                  <AddPhotosForm id={request.id} />
                </div>
              ) : null}
            </Card>
          ) : request.is_editable ? (
            <Card className="p-5">
              <h2 className="font-semibold tracking-tight">Photos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A picture of the problem saves a lot of back-and-forth.
              </p>

              <div className="mt-4">
                <AddPhotosForm id={request.id} />
              </div>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Where</h2>

            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <Row label="Town" value={request.location?.label ?? "—"} />
              <Row label="Address" value={request.address ?? "Not given"} />
              <Row label="Access notes" value={request.instructions ?? "None"} />
              {request.latitude !== null && request.latitude !== undefined ? (
                <Row
                  label="Pin"
                  value={`${request.latitude.toFixed(5)}, ${request.longitude?.toFixed(5) ?? "—"}`}
                />
              ) : null}
            </dl>
          </Card>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Details</h2>

            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <Row label="Urgency" value={request.urgency_label} />
              <Row
                label="Preferred date"
                value={request.preferred_date ? formatDate(request.preferred_date) : "Any"}
              />
              <Row label="Preferred time" value={request.preferred_time_slot_label ?? "Any time"} />
              <Row
                label="Budget"
                value={
                  request.budget_min_cents === null && request.budget_max_cents === null
                    ? "Open to quotes"
                    : `${request.budget_min_cents !== null ? formatMoney(request.budget_min_cents) : "open"} – ${
                        request.budget_max_cents !== null ? formatMoney(request.budget_max_cents) : "open"
                      }`
                }
              />
              <Row label="Quotes" value={String(request.quotes_count)} />
              {request.expires_at ? (
                <Row label="Open until" value={formatDateTime(request.expires_at)} />
              ) : null}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Quotes</h2>

            {/*
              Quotations land in the next slice. Until then this reports the
              count the API actually holds rather than inventing a list — a job
              that has been quoted says so, and the customer is not shown a
              fabricated comparison table.
            */}
            <p className="mt-3 text-sm text-muted-foreground">
              {request.quotes_count === 0
                ? `No quotes yet. Professionals covering ${
                    request.location?.label ?? "your town"
                  } can see this job on their board.`
                : `${request.quotes_count} professional${
                    request.quotes_count === 1 ? " has" : "s have"
                  } quoted on this job.`}
            </p>
          </Card>

          {request.is_cancellable ? (
            <Card className="p-5">
              <h2 className="font-semibold tracking-tight">Cancel this request</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                It stays on your record, but professionals can no longer quote.
              </p>

              <CancelRequestForm id={request.id} />
            </Card>
          ) : (
            <p className="px-1 text-xs text-muted-foreground">
              {request.status === "cancelled"
                ? "This request was cancelled."
                : "This request can no longer be cancelled because work is already under way."}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium sm:text-right">{value}</dd>
    </div>
  );
}
