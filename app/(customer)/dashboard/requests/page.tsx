import Link from "next/link";
import type { Metadata } from "next";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { requireRole } from "@/lib/dal";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import { getMyServiceRequests, type RequestListFilters } from "@/lib/requests";
import type { ServiceRequestStatus } from "@/lib/types";

export const metadata: Metadata = { title: "My requests" };

/** The status tabs, in the order a job moves through them. */
const TABS: { value: ServiceRequestStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "quoted", label: "Quoted" },
  { value: "awarded", label: "Awarded" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * The customer's own jobs (spec §8).
 *
 * A Server Component: the list is per-account, so it is fetched with the
 * session's token and never cached. The status tabs are links rather than client
 * state, which keeps the filter in the URL — so a customer can bookmark "my open
 * jobs" and share the state by copying the address bar.
 */
export default async function MyRequestsPage(props: PageProps<"/dashboard/requests">) {
  const session = await requireRole("customer");
  const params = await props.searchParams;

  const status = single(params.status);
  const page = single(params.page);

  const filters: RequestListFilters = {
    status,
    q: single(params.q),
    service_id: single(params.service_id),
    sort: single(params.sort),
    page,
  };

  const requests = await getMyServiceRequests(session.token, filters);

  const active = status ?? "";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every job you have posted, and where it has got to.
          </p>
        </div>

        <ButtonLink href="/dashboard/requests/new" variant="accent">
          Post a job
        </ButtonLink>
      </header>

      <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((tab) => {
          const isActive = tab.value === active;
          const query = tab.value === "" ? "" : `?status=${tab.value}`;

          return (
            <Link
              key={tab.value || "all"}
              href={`/dashboard/requests${query}`}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-line hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {requests.data.length === 0 ? (
        <EmptyState
          title={active === "" ? "You have not posted a job yet" : `No ${active} requests`}
          description={
            active === ""
              ? "Describe what needs fixing, add a photo or two, and verified professionals covering your town will send you quotes."
              : "Nothing here at the moment. Try another tab."
          }
          action={
            active === "" ? (
              <ButtonLink href="/dashboard/requests/new">Post your first job</ButtonLink>
            ) : (
              <ButtonLink href="/dashboard/requests" variant="secondary">
                See all requests
              </ButtonLink>
            )
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {requests.data.map((request) => (
              <li key={request.id}>
                <Card className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/requests/${request.id}`}
                          className="font-semibold tracking-tight text-foreground hover:text-brand"
                        >
                          {request.title}
                        </Link>

                        <StatusBadge status={request.status} />
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.reference} · posted {formatRelative(request.created_at)}
                        {request.location ? ` · ${request.location.label}` : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {request.quotes_count === 0
                          ? "No quotes yet"
                          : `${request.quotes_count} quote${
                              request.quotes_count === 1 ? "" : "s"
                            }`}
                      </p>

                      {request.service ? (
                        <p className="text-xs text-muted-foreground">{request.service.name}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    <span>{request.urgency_label}</span>

                    {request.preferred_date ? (
                      <span>Wanted for {formatDate(request.preferred_date)}</span>
                    ) : null}

                    {request.budget_min_cents !== null || request.budget_max_cents !== null ? (
                      <span>
                        Budget{" "}
                        {request.budget_min_cents !== null
                          ? formatMoney(request.budget_min_cents)
                          : "open"}{" "}
                        –{" "}
                        {request.budget_max_cents !== null
                          ? formatMoney(request.budget_max_cents)
                          : "open"}
                      </span>
                    ) : null}

                    {request.accepts_quotations ? (
                      <Badge tone="success">Accepting quotes</Badge>
                    ) : null}

                    {request.is_expired ? <Badge tone="danger">Expired</Badge> : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/*
            The paginator's own links already carry the active filters — Laravel
            built them with `withQueryString()` — so only the path is replaced.
          */}
          <Pagination links={paginationLinks(requests, "/dashboard/requests")} className="mt-2" />
        </>
      )}
    </div>
  );
}
