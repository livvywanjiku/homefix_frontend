import Link from "next/link";
import type { Metadata } from "next";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { requireRole } from "@/lib/dal";
import { formatDate, formatMoney } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import { getMyQuotations } from "@/lib/quotations";

export const metadata: Metadata = { title: "My quotes" };

/**
 * The statuses the API accepts. `""` is the unfiltered view and is deliberately
 * not sent — the request class validates against the enum, so an empty value
 * would be a 422 rather than "all".
 */
const STATUSES = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "expired", label: "Expired" },
] as const;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Everything this professional has priced (spec §9).
 *
 * The board only shows open jobs, so without this page an offer disappears the
 * moment a job is awarded — exactly when the professional most wants to know
 * what became of it.
 */
export default async function MyQuotationsPage(props: PageProps<"/pro/quotations">) {
  const session = await requireRole("professional");
  const params = await props.searchParams;

  const requested = single(params.status);
  const status = STATUSES.some((option) => option.value === requested) ? requested : undefined;

  const quotations = await getMyQuotations(session.token, {
    status,
    page: single(params.page),
    per_page: 15,
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My quotes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every price you have sent, and what the customer decided.
        </p>
      </header>

      <nav aria-label="Quote status" className="flex gap-1 overflow-x-auto border-b border-line">
        {STATUSES.map((option) => {
          const active = (requested ?? "") === option.value;
          const query = option.value === "" ? "" : `?status=${option.value}`;

          return (
            <Link
              key={option.value || "all"}
              href={`/pro/quotations${query}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-line hover:text-foreground"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      {quotations.data.length === 0 ? (
        <EmptyState
          title={status ? `No ${status} quotes` : "You have not sent any quotes yet"}
          description={
            status
              ? "There are no quotes with this status. Try the unfiltered list."
              : "Browse the job board and price the work you can do — your quotes and their outcomes live here."
          }
          action={
            <ButtonLink href="/pro/requests" variant="secondary">
              Go to the job board
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {quotations.data.map((quotation) => (
              <li key={quotation.id}>
                <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/pro/quotations/${quotation.id}`}
                        className="font-semibold tracking-tight text-foreground hover:text-brand"
                      >
                        {quotation.service_request?.title ?? "Job"}
                      </Link>
                      <StatusBadge status={quotation.status} />
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {quotation.reference}
                      {quotation.service_request
                        ? ` · job ${quotation.service_request.reference}`
                        : ""}
                      {quotation.created_at ? ` · sent ${formatDate(quotation.created_at)}` : ""}
                    </p>

                    {quotation.message ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {quotation.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Your price</p>
                      <p className="font-semibold">{formatMoney(quotation.total_cents)}</p>
                      {quotation.valid_until ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          valid until {formatDate(quotation.valid_until)}
                        </p>
                      ) : null}
                    </div>

                    <ButtonLink href={`/pro/quotations/${quotation.id}`} variant="secondary" size="sm">
                      View
                    </ButtonLink>
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <Pagination links={paginationLinks(quotations, "/pro/quotations")} />
        </>
      )}
    </div>
  );
}
