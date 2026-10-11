import type { Metadata } from "next";
import { ProfessionalCard } from "@/components/professional-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ApiError } from "@/lib/api";
import { getLocations, getServiceCategories, getServices } from "@/lib/catalogue";
import { searchProfessionals, type ProfessionalSearchFilters } from "@/lib/discovery";
import { paginationLinks } from "@/lib/pagination";
import type { ProfessionalCard as ProfessionalCardData } from "@/lib/types";
import { ProfessionalFilters } from "./professional-filters";

export const metadata: Metadata = {
  title: "Find a professional",
  description:
    "Search verified plumbers, electricians, cleaners, carpenters and more across Kenya. Filter by service, town, budget, rating and availability.",
};

/** `searchParams` values are `string | string[] | undefined`; keep only plain strings. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Professional search (spec §13).
 *
 * A Server Component: the visitor's filters go to Laravel, which does the
 * filtering and returns one page of results. Nothing is downloaded and hidden in
 * the browser, and the page works identically whether the visitor is a guest or
 * signed in — the CTA on each card is what differs.
 */
export default async function ProfessionalsPage(props: PageProps<"/professionals">) {
  const params = await props.searchParams;

  const filters: ProfessionalSearchFilters = {
    q: single(params.q),
    service_id: single(params.service_id),
    service_category_id: single(params.service_category_id),
    location_id: single(params.location_id),
    max_distance_km: single(params.max_distance_km),
    min_rating: single(params.min_rating),
    max_price_cents: single(params.max_price_cents),
    date: single(params.date),
    sort: single(params.sort),
    page: single(params.page),
  };

  const [categories, services, locations] = await Promise.all([
    getServiceCategories(),
    getServices(),
    getLocations(),
  ]);

  /*
   * A hand-edited URL can carry filters the API refuses — "nearest first" with
   * no location to measure from, a date in the past, a price ceiling below its
   * floor. That is an ordinary bad link rather than a server fault, so it is
   * answered with the empty state plus a way out, not a 500.
   */
  let results;
  try {
    results = await searchProfessionals(filters);
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      return (
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">Find a professional</h1>

          <div className="mt-10">
            <EmptyState
              title="Those filters don’t add up"
              description={
                Object.values(error.validationErrors())[0]?.[0] ??
                "One of the search options was invalid. Clear the filters and try again."
              }
              action={<ButtonLink href="/professionals">Start a new search</ButtonLink>}
            />
          </div>
        </div>
      );
    }

    throw error;
  }

  const professionals: ProfessionalCardData[] = results.data;
  const total = results.meta.total;

  // Echoed back into the rail so a refresh does not silently reset the search.
  const current: Record<string, string> = Object.fromEntries(
    Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Find a professional</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Every professional listed here has had their identity documents checked
          by our team. Compare ratings, prices and availability, then send them
          the job.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[18rem_1fr] lg:items-start">
        <aside className="rounded-xl border border-line bg-card p-5 lg:sticky lg:top-24">
          <h2 className="mb-4 font-semibold tracking-tight">Filters</h2>

          <ProfessionalFilters
            categories={categories}
            services={services}
            locations={locations}
            current={current}
          />
        </aside>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold tracking-tight">
              {total === 0
                ? "No professionals found"
                : `${total} professional${total === 1 ? "" : "s"}`}
            </h2>

            {total > 0 ? (
              <p className="text-sm text-muted-foreground">
                Page {results.meta.current_page} of {results.meta.last_page}
              </p>
            ) : null}
          </div>

          {professionals.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="Nobody matches that search yet"
                description="Try widening the location, raising the budget, or removing the availability date — there may be professionals who can still take the job."
                action={
                  <ButtonLink href="/professionals" variant="secondary">
                    Clear filters
                  </ButtonLink>
                }
              />
            </div>
          ) : (
            <>
              <ul className="mt-5 grid gap-5 xl:grid-cols-2">
                {professionals.map((professional) => (
                  <li key={professional.id}>
                    <ProfessionalCard professional={professional} />
                  </li>
                ))}
              </ul>

              <Pagination
                links={paginationLinks(results, "/professionals")}
                className="mt-8"
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
