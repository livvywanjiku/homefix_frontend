import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatDate, formatMoney } from "@/lib/format";
import type { Quotation } from "@/lib/types";
import { AcceptQuoteButton, RejectQuoteButton } from "./quotation-actions";

/** The business name is what the customer is choosing between, not the account. */
function professionalName(quotation: Quotation): string {
  return (
    quotation.professional?.business_name ??
    quotation.professional?.name ??
    "This professional"
  );
}

/**
 * The offers on one job (spec §9).
 *
 * Ordered by the API: accepted first, then live offers cheapest first, then the
 * settled ones — so the card the customer is most likely to act on is already
 * at the top. The client does not re-sort, because the server's ranking is the
 * one the comparison is meant to express.
 *
 * Each card shows the category totals rather than every line: a customer
 * comparing four offers is deciding on price, track record and timing. The
 * itemised breakdown is behind a disclosure for the second look.
 */
export function QuotationComparison({
  requestId,
  quotations,
}: {
  requestId: number;
  quotations: Quotation[];
}) {
  if (quotations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No quotes yet. Professionals covering this area can see the job on their board.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {quotations.map((quotation) => {
        const professional = professionalName(quotation);

        return (
          <li key={quotation.id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold tracking-tight">{professional}</p>
                    <StatusBadge status={quotation.status} />
                    {quotation.has_expired ? (
                      <span className="text-xs text-muted-foreground">Price lapsed</span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <RatingStars
                      value={quotation.professional?.rating_avg ?? null}
                      count={quotation.professional?.rating_count ?? undefined}
                      size="sm"
                    />

                    {quotation.professional?.completed_jobs_count ? (
                      <span>
                        {quotation.professional.completed_jobs_count} job
                        {quotation.professional.completed_jobs_count === 1 ? "" : "s"} completed
                      </span>
                    ) : null}

                    <span>{quotation.reference}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Their price</p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatMoney(quotation.total_cents)}
                  </p>
                </div>
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {(
                  [
                    ["Labour", quotation.labour_cents],
                    ["Materials", quotation.materials_cents],
                    ["Transport", quotation.transport_cents],
                    ["Other", quotation.other_cents],
                  ] as const
                )
                  .filter(([, cents]) => cents > 0)
                  .map(([label, cents]) => (
                    <div key={label} className="flex items-baseline gap-1.5">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium tabular-nums">{formatMoney(cents)}</dd>
                    </div>
                  ))}
              </dl>

              {quotation.items.length > 0 ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    What the price covers ({quotation.items.length} line
                    {quotation.items.length === 1 ? "" : "s"})
                  </summary>

                  <ul className="mt-2 flex flex-col gap-1.5">
                    {quotation.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-1.5 last:border-0 last:pb-0"
                      >
                        <span className="text-muted-foreground">
                          {item.description}{" "}
                          <span className="text-xs">
                            · {item.category_label} · {item.quantity} ×{" "}
                            {formatMoney(item.unit_price_cents)}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatMoney(item.total_cents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {quotation.message ? (
                <p className="mt-3 border-t border-line pt-3 text-sm leading-6 whitespace-pre-line text-muted-foreground">
                  {quotation.message}
                </p>
              ) : null}

              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-baseline gap-1.5">
                  <dt>Working days</dt>
                  <dd className="font-medium text-foreground">
                    {quotation.estimated_days === null ? "Not stated" : quotation.estimated_days}
                  </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt>Can start</dt>
                  <dd className="font-medium text-foreground">
                    {quotation.available_from ? formatDate(quotation.available_from) : "Any time"}
                  </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt>Valid until</dt>
                  <dd className="font-medium text-foreground">
                    {quotation.valid_until ? formatDate(quotation.valid_until) : "No deadline"}
                  </dd>
                </div>
              </dl>

              {quotation.status === "accepted" ? (
                <div className="mt-4 rounded-lg border border-success/25 bg-success-50 px-3 py-2 text-sm text-success dark:bg-success/10">
                  <p>
                    You accepted this quote
                    {quotation.booking ? ` — booking ${quotation.booking.reference}` : ""}.
                  </p>

                  {quotation.contact ? (
                    <p className="mt-1">
                      You can now reach {quotation.contact.name} on{" "}
                      <a
                        href={`tel:${quotation.contact.phone}`}
                        className="font-medium underline underline-offset-2"
                      >
                        {quotation.contact.phone}
                      </a>{" "}
                      to arrange the visit.
                    </p>
                  ) : (
                    <p className="mt-1">
                      The professional has your contact details and can arrange the visit.
                    </p>
                  )}
                </div>
              ) : null}

              {quotation.status === "pending" && !quotation.is_acceptable ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  This price can no longer be accepted — the job has closed or the offer has
                  lapsed.
                </p>
              ) : null}

              {(quotation.can_be_accepted && quotation.is_acceptable) ||
              quotation.can_be_rejected ? (
                <div className="mt-4 flex flex-wrap items-start gap-2 border-t border-line pt-4">
                  {/*
                    `can_be_accepted` is the policy's ownership answer; whether
                    the offer can still be taken is `is_acceptable` (the job is
                    open and the price has not lapsed). Both are needed — after
                    an award the policy still says "this is your job", but the
                    quote must not offer itself again.
                  */}
                  {quotation.can_be_accepted && quotation.is_acceptable ? (
                    <AcceptQuoteButton
                      requestId={requestId}
                      quotationId={quotation.id}
                      reference={quotation.reference}
                      professional={professional}
                    />
                  ) : null}

                  {quotation.can_be_rejected ? (
                    <RejectQuoteButton
                      requestId={requestId}
                      quotationId={quotation.id}
                      reference={quotation.reference}
                      professional={professional}
                    />
                  ) : null}
                </div>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
