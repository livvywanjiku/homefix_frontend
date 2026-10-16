import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { requireRole } from "@/lib/dal";
import { formatDate, formatMoney, formatRelative } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import { getMyProfile } from "@/lib/professional";
import { getRequestBoard, type RequestBoardFilters } from "@/lib/request-board";
import { ProfileSetupPrompt } from "../profile-setup-prompt";

export const metadata: Metadata = { title: "Job board" };

/** The sort options the board endpoint accepts, in the order they are offered. */
const SORTS = [
  { value: "recent", label: "Newest first" },
  { value: "urgent", label: "Most urgent" },
  { value: "budget", label: "Highest budget" },
  { value: "expiring", label: "Closing soon" },
];

const URGENCIES = [
  { value: "urgent", label: "Urgent" },
  { value: "soon", label: "Within a week" },
  { value: "flexible", label: "Flexible" },
];

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * The open-request board (spec §8).
 *
 * The filters are a plain GET form rather than client state, so the board is
 * shareable and the back button works. The default scope is the professional's
 * own services and service areas, which is the only view that is useful on a
 * normal day; the wider board is one click away.
 */
export default async function RequestBoardPage(props: PageProps<"/pro/requests">) {
  const session = await requireRole("professional");
  const profile = await getMyProfile(session.token);

  /*
   * The default scope is the professional's own services and areas, and both
   * live on the profile — which the board endpoint needs to exist before it
   * will answer at all.
   */
  if (profile === null) {
    return <ProfileSetupPrompt />;
  }

  const params = await props.searchParams;

  const scope = single(params.scope) === "all" ? "all" : "matching";

  const filters: RequestBoardFilters = {
    scope,
    q: single(params.q),
    urgency: single(params.urgency),
    min_budget_cents: single(params.min_budget),
    max_distance_km: single(params.max_distance_km),
    sort: single(params.sort),
    page: single(params.page),
  };

  const board = await getRequestBoard(session.token, filters);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job board</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {scope === "matching"
              ? "Open jobs in the services you offer, in the towns you cover."
              : "Every open job on HomeFix Connect."}
          </p>
        </div>
      </header>

      <nav aria-label="Board scope" className="flex gap-1 border-b border-line">
        {[
          { value: "matching", label: "Matching my services" },
          { value: "all", label: "Whole board" },
        ].map((tab) => {
          const isActive = tab.value === scope;
          const query = tab.value === "matching" ? "" : "?scope=all";

          return (
            <Link
              key={tab.value}
              href={`/pro/requests${query}`}
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

      <Card className="p-4">
        {/* A GET form: the filters land in the URL, so the result is shareable. */}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="scope" value={scope} />

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Search</span>
            <input
              type="search"
              name="q"
              defaultValue={single(params.q) ?? ""}
              placeholder="Title or reference"
              className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Urgency</span>
            <select
              name="urgency"
              defaultValue={single(params.urgency) ?? ""}
              className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
            >
              <option key="any" value="">Any</option>
              {URGENCIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Budget from (KSh)</span>
            <input
              type="number"
              name="min_budget"
              min={0}
              step={100}
              inputMode="numeric"
              defaultValue={
                single(params.min_budget) ? String(Number(single(params.min_budget)) / 100) : ""
              }
              className="h-10 w-36 rounded-lg border border-line bg-card px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Within (km)</span>
            <input
              type="number"
              name="max_distance_km"
              min={1}
              max={500}
              inputMode="numeric"
              defaultValue={single(params.max_distance_km) ?? ""}
              placeholder="Any"
              className="h-10 w-28 rounded-lg border border-line bg-card px-3 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Sort</span>
            <select
              name="sort"
              defaultValue={single(params.sort) ?? "recent"}
              className="h-10 rounded-lg border border-line bg-card px-3 text-sm"
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Apply
          </button>
        </form>
      </Card>

      {board.data.length === 0 ? (
        <EmptyState
          title={scope === "matching" ? "No matching jobs right now" : "The board is empty"}
          description={
            scope === "matching"
              ? "Nothing open in your services and towns at the moment. Add more services or service areas to widen what you see — or check the whole board."
              : "No customer has an open request at the moment. Check back shortly."
          }
          action={
            scope === "matching" ? (
              <ButtonLink href="/pro/requests?scope=all" variant="secondary">
                See the whole board
              </ButtonLink>
            ) : (
              <ButtonLink href="/pro/services" variant="secondary">
                Review your services
              </ButtonLink>
            )
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 lg:grid-cols-2">
            {board.data.map((request) => (
              <li key={request.id}>
                <Card className="flex h-full flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/pro/requests/${request.id}`}
                        className="font-semibold tracking-tight text-foreground hover:text-brand"
                      >
                        {request.title}
                      </Link>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.reference} · {request.location?.label ?? "Unknown town"} ·{" "}
                        {formatRelative(request.created_at)}
                      </p>
                    </div>

                    <Badge tone={request.urgency === "urgent" ? "danger" : "neutral"}>
                      {request.urgency_label}
                    </Badge>
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {request.description}
                  </p>

                  <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
                    {request.service ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Service</dt>
                        <dd className="font-medium">{request.service.name}</dd>
                      </div>
                    ) : null}

                    <div>
                      <dt className="text-xs text-muted-foreground">Budget</dt>
                      <dd className="font-medium">
                        {request.budget_max_cents === null
                          ? "Open"
                          : `up to ${formatMoney(request.budget_max_cents)}`}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs text-muted-foreground">Wanted</dt>
                      <dd className="font-medium">
                        {request.preferred_date ? formatDate(request.preferred_date) : "Flexible"}
                      </dd>
                    </div>

                    {request.distance_km !== undefined && request.distance_km !== null ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Distance</dt>
                        <dd className="font-medium">~{request.distance_km} km</dd>
                      </div>
                    ) : null}

                    <div>
                      <dt className="text-xs text-muted-foreground">Photos</dt>
                      <dd className="font-medium">
                        {(request.images?.length ?? 0) > 0 ? "Yes" : "None"}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>

          <Pagination links={paginationLinks(board, "/pro/requests")} className="mt-2" />
        </>
      )}
    </div>
  );
}
