import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { ApiError } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getMyQuotation } from "@/lib/quotations";
import type { Quotation } from "@/lib/types";
import { QuotationForm } from "../quotation-form";
import { WithdrawQuoteButton } from "./withdraw-button";

type Props = PageProps<"/pro/quotations/[id]">;

export const metadata: Metadata = { title: "Quote" };

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function statusNote(quotation: Quotation): string {
  switch (quotation.status) {
    case "pending":
      return quotation.can_be_edited
        ? "Waiting for the customer to decide. You can revise the price or withdraw until they do."
        : "Waiting for the customer to decide.";
    case "accepted":
      return "Your quote was accepted. You can now reach the customer directly to arrange the visit.";
    case "rejected":
      return "The customer chose another quote on this job.";
    case "withdrawn":
      return "You withdrew this quote. A withdrawn quote cannot be sent again on this job.";
    default:
      return "This quote has expired. Send a fresh one from the job board if the job is still open.";
  }
}

/**
 * One quote, from the professional's side (spec §9).
 *
 * Serves as both the record and the revision screen. The breakdown is shown
 * exactly as the customer sees it, because a professional revising a price is
 * looking at the same comparison they are competing in.
 */
export default async function QuotationDetailPage({ params, searchParams }: Props) {
  const session = await requireRole("professional");

  const { id } = await params;
  const query = await searchParams;

  let quotation: Quotation;

  try {
    quotation = await getMyQuotation(session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();

    throw error;
  }

  const job = quotation.service_request;
  const jobIsOpen = job?.status === "open" || job?.status === "quoted";

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/pro/quotations" className="hover:text-foreground hover:underline">
          My quotes
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-foreground">{quotation.reference}</span>
      </nav>

      {single(query.sent) ? (
        <FormMessage tone="success">
          Your quote is with the customer. It stays live until they decide or it expires.
        </FormMessage>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{quotation.reference}</h1>
            <StatusBadge status={quotation.status} />
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {job ? (
              jobIsOpen ? (
                <Link
                  href={`/pro/requests/${job.id}`}
                  className="hover:text-foreground hover:underline"
                >
                  {job.title}
                </Link>
              ) : (
                job.title
              )
            ) : (
              "Job"
            )}
            {job ? ` · ${job.reference}` : ""}
            {quotation.created_at ? ` · sent ${formatDateTime(quotation.created_at)}` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground">Your total</p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatMoney(quotation.total_cents)}
          </p>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">{statusNote(quotation)}</p>

      {quotation.contact ? (
        <Card className="p-5">
          <h2 className="font-semibold tracking-tight">Your customer</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You won this job, so you can arrange the visit directly.
          </p>

          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{quotation.contact.name}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">
                <a
                  href={`tel:${quotation.contact.phone}`}
                  className="text-brand hover:underline"
                >
                  {quotation.contact.phone}
                </a>
              </dd>
            </div>
          </dl>
        </Card>
      ) : null}

      <Card className="p-5">
        <h2 className="font-semibold tracking-tight">The breakdown</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">What it covers</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Each</th>
                <th className="pb-2 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 text-muted-foreground">{item.category_label}</td>
                  <td className="py-2.5">{item.description}</td>
                  <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatMoney(item.unit_price_cents)}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums">
                    {formatMoney(item.total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4 text-sm">
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
              <div key={label} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="tabular-nums">{formatMoney(cents)}</dd>
              </div>
            ))}

          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-2 font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(quotation.total_cents)}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold tracking-tight">Your note</h2>

          {quotation.message ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-line text-muted-foreground">
              {quotation.message}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No note was added.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold tracking-tight">Timing</h2>

          <dl className="mt-3 flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Estimated working days</dt>
              <dd className="font-medium">
                {quotation.estimated_days === null ? "Not stated" : quotation.estimated_days}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Can start</dt>
              <dd className="font-medium">
                {quotation.available_from ? formatDate(quotation.available_from) : "Any time"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Price valid until</dt>
              <dd className="font-medium">
                {quotation.valid_until ? formatDate(quotation.valid_until) : "No deadline"}
              </dd>
            </div>
            {quotation.decided_at ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Decided</dt>
                <dd className="font-medium">{formatDateTime(quotation.decided_at)}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>

      {quotation.can_be_edited ? (
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Revise this quote</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The customer sees the new price straight away. Saving replaces the breakdown
              entirely.
            </p>

            <div className="mt-5">
              <QuotationForm serviceRequestId={job?.id ?? 0} quotation={quotation} />
            </div>
          </Card>

          {quotation.can_be_withdrawn ? (
            <Card className="p-5">
              <h2 className="font-semibold tracking-tight">Withdraw this quote</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                The customer can no longer choose it, and it cannot be sent again on this job.
              </p>

              <WithdrawQuoteButton id={quotation.id} />
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
