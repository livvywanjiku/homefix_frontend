import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getMyProfile } from "@/lib/professional";
import { getMyQuotationForRequest } from "@/lib/quotations";
import { getBoardRequest } from "@/lib/request-board";
import type { Quotation, ServiceRequest } from "@/lib/types";
import { QuotationForm } from "../../quotations/quotation-form";

type Props = PageProps<"/pro/requests/[id]">;

export const metadata: Metadata = { title: "Job" };

/**
 * One job on the board (spec §8).
 *
 * Deliberately without the street address or the access notes: Laravel withholds
 * both from anyone who is not entitled to turn up, so a professional reads the
 * town, the job and the budget — enough to decide whether to quote, and nothing
 * that would let them arrive unannounced.
 */
export default async function BoardRequestPage({ params }: Props) {
  const session = await requireRole("professional");
  const { id } = await params;

  let request: ServiceRequest;
  let profile: Awaited<ReturnType<typeof getMyProfile>>;
  let existing: Quotation | null;

  try {
    [request, profile, existing] = await Promise.all([
      getBoardRequest(session.token, id),
      getMyProfile(session.token),
      getMyQuotationForRequest(session.token, id),
    ]);
  } catch (error) {
    /*
     * A job that has been awarded, cancelled or has lapsed answers 403, and one
     * that never existed answers 404. Both are "no such job" here — the board
     * must not become a way to confirm which requests exist.
     */
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      notFound();
    }

    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/pro/requests" className="hover:text-foreground hover:underline">
          Job board
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-foreground">{request.reference}</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{request.title}</h1>
          <Badge tone={request.urgency === "urgent" ? "danger" : "neutral"}>
            {request.urgency_label}
          </Badge>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {request.reference} · posted {formatDateTime(request.created_at)}
          {request.customer ? ` by ${request.customer.name}` : ""}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">What needs doing</h2>

            <p className="mt-3 text-sm leading-6 whitespace-pre-line text-muted-foreground">
              {request.description}
            </p>
          </Card>

          {request.images && request.images.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-semibold tracking-tight">
                Photos ({request.images.length})
              </h2>

              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {request.images.map((image) => (
                  <li key={image.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- storage-served thumbnails */}
                    <img
                      src={image.url}
                      alt={image.original_name ?? "Photo of the job"}
                      className="h-28 w-full rounded-lg border border-line object-cover"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold tracking-tight">
                {existing ? "Your quote" : "Send a quote"}
              </h2>
              {existing ? <StatusBadge status={existing.status} /> : null}
            </div>

            {existing ? (
              <div className="mt-3 flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {existing.status === "pending"
                    ? "Waiting for the customer to decide. You can revise the price until they do."
                    : existing.status === "accepted"
                      ? "Your quote was accepted. The customer can see your contact details now."
                      : existing.status === "rejected"
                        ? "The customer chose another quote on this job."
                        : existing.status === "withdrawn"
                          ? "You withdrew this quote, so the customer can no longer choose it."
                          : "This quote has expired."}
                </p>

                <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Your price</dt>
                    <dd className="font-semibold">{formatMoney(existing.total_cents)}</dd>
                  </div>
                  {existing.valid_until ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Valid until</dt>
                      <dd className="font-medium">{formatDate(existing.valid_until)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-muted-foreground">Reference</dt>
                    <dd className="font-medium">{existing.reference}</dd>
                  </div>
                </dl>

                <div>
                  <ButtonLink href={`/pro/quotations/${existing.id}`} variant="secondary">
                    {existing.can_be_edited ? "View or revise" : "View quote"}
                  </ButtonLink>
                </div>
              </div>
            ) : !request.accepts_quotations ? (
              <p className="mt-3 text-sm text-muted-foreground">
                This job is no longer accepting quotes.
              </p>
            ) : !profile?.is_verified ? (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Only verified professionals can price work. Finish your verification to quote
                  on jobs like this one.
                </p>
                <div>
                  <ButtonLink href="/pro/verification" variant="secondary">
                    Go to verification
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <QuotationForm serviceRequestId={request.id} />
              </div>
            )}
          </Card>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">The job</h2>

            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <Row label="Service" value={request.service?.name ?? "—"} />
              <Row label="Town" value={request.location?.label ?? "—"} />
              <Row
                label="Wanted"
                value={request.preferred_date ? formatDate(request.preferred_date) : "Flexible"}
              />
              <Row
                label="Time of day"
                value={request.preferred_time_slot_label ?? "Any time"}
              />
              <Row
                label="Budget"
                value={
                  request.budget_min_cents === null && request.budget_max_cents === null
                    ? "Not stated — quote what it is worth"
                    : `${request.budget_min_cents !== null ? formatMoney(request.budget_min_cents) : "open"} – ${
                        request.budget_max_cents !== null ? formatMoney(request.budget_max_cents) : "open"
                      }`
                }
              />
              {request.distance_km !== undefined && request.distance_km !== null ? (
                <Row label="Distance" value={`~${request.distance_km} km from your base`} />
              ) : null}
              {request.expires_at ? (
                <Row label="Closes" value={formatDateTime(request.expires_at)} />
              ) : null}
              <Row
                label="Quotes so far"
                value={
                  request.quotes_count === 0
                    ? "None yet"
                    : String(request.quotes_count)
                }
              />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Location</h2>

            <p className="mt-3 text-sm text-muted-foreground">
              The exact address and access notes are released to the professional
              the customer awards the job to. Until then you have the town, which
              is what you need to decide whether the trip is worth it.
            </p>
          </Card>
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
