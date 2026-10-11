import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { getToken } from "@/lib/dal";
import { getPublicProfessional } from "@/lib/discovery";
import { formatDate, formatFrom, formatMoney, formatTimeRange, weekdayName } from "@/lib/format";
import type { ProfessionalProfile } from "@/lib/types";

type Props = PageProps<"/professionals/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = await getPublicProfessional(id);

  if (!page) return { title: "Professional not found" };

  const { profile } = page;

  return {
    title: profile.business_name,
    description:
      profile.about?.slice(0, 155) ??
      `${profile.business_name} — verified ${profile.services
        .map((offering) => offering.service?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ")} professional on HomeFix Connect.`,
  };
}

/**
 * A professional's public profile (spec §12).
 *
 * Public: a visitor can read everything here before deciding to sign up, which
 * is the whole point of the guest-access model. The contact details are not on
 * this page at all — Laravel withholds them — so there is nothing to hide from
 * the visitor, and the only way to reach the professional is to post a request.
 */
export default async function PublicProfessionalPage({ params }: Props) {
  const { id } = await params;

  // Sent with the viewer's own token when there is one, so a signed-in
  // professional is told the truth about whether they may post a request.
  const page = await getPublicProfessional(id, await getToken());

  if (!page) notFound();

  const { profile, canRequestService } = page;

  const town = profile.base_location?.label;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/professionals" className="hover:text-foreground hover:underline">
          Professionals
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-foreground">{profile.business_name}</span>
      </nav>

      <header className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-5">
          <Avatar
            src={profile.user?.avatar_url}
            name={profile.business_name}
            size="lg"
            className="size-20 text-2xl"
          />

          <div>
            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
              {profile.business_name}
              {profile.is_verified ? <VerifiedBadge /> : null}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <RatingStars value={profile.rating_avg} count={profile.rating_count} />

              {town ? <span className="text-muted-foreground">{town}</span> : null}

              {profile.experience_years !== null ? (
                <span className="text-muted-foreground">
                  {profile.experience_years} year
                  {profile.experience_years === 1 ? "" : "s"} experience
                </span>
              ) : null}
            </div>

            {profile.completed_jobs_count > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {profile.completed_jobs_count} job
                {profile.completed_jobs_count === 1 ? "" : "s"} completed through HomeFix
                Connect
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 lg:text-right">
          <p className="text-lg font-semibold text-navy">
            {formatFrom(profile.from_price_cents ?? null)}
          </p>

          {/*
            The guest path. This links into a protected route, so an unauthenticated
            visitor is redirected to sign in and returned here afterwards with the
            service they were looking at still selected.

            A signed-in professional or administrator is told plainly that they
            cannot post a request, rather than being sent into a wizard that would
            reject them at the last step.
          */}
          {canRequestService ? (
            <ButtonLink
              href={`/dashboard/requests/new?professional=${profile.id}`}
              variant="accent"
              className="mt-1 w-full sm:w-auto"
            >
              Request this professional
            </ButtonLink>
          ) : (
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Requesting a service is available on a customer account.
            </p>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-lg font-semibold tracking-tight">About</h2>

            <p className="mt-3 text-base leading-7 whitespace-pre-line text-muted-foreground">
              {profile.about ?? `${profile.business_name} has not written an introduction yet.`}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight">Services and pricing</h2>

            {profile.services.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="No services listed"
                  description="This professional has not published their service list yet."
                />
              </div>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {profile.services.map((offering) => (
                  <li key={offering.id}>
                    <Card className="flex h-full flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium text-foreground">
                          {offering.service?.name ?? "Service"}
                        </h3>

                        <Badge>{offering.pricing_label}</Badge>
                      </div>

                      {offering.description ? (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {offering.description}
                        </p>
                      ) : null}

                      <p className="mt-auto pt-2 font-semibold text-navy">
                        {priceRange(offering.price_min_cents, offering.price_max_cents)}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold tracking-tight">Recent work</h2>

            {profile.portfolio_items.length === 0 ? (
              <div className="mt-3">
                <EmptyState
                  title="No portfolio yet"
                  description="Completed jobs this professional has published will appear here."
                />
              </div>
            ) : (
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {profile.portfolio_items.map((item) => (
                  <li key={item.id}>
                    <Card className="flex h-full flex-col overflow-hidden">
                      {item.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- storage-served, and a gallery of these is not worth the optimiser
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="h-40 w-full border-b border-line object-cover"
                        />
                      ) : null}

                      <div className="flex flex-1 flex-col gap-2 p-4">
                        <h3 className="font-medium text-foreground">{item.title}</h3>

                        {item.description ? (
                          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}

                        <p className="mt-auto pt-2 text-xs text-muted-foreground">
                          {[item.service?.name, item.location?.label, item.completed_on]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Working hours</h2>

            {profile.availabilities.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No standard hours published — message them to agree a time.
              </p>
            ) : (
              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                {profile.availabilities.map((day) => (
                  <div key={day.id} className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">{weekdayName(day.day_of_week)}</dt>
                    <dd className="font-medium">
                      {formatTimeRange(day.start_time, day.end_time)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {profile.availability_exceptions.length > 0 ? (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="text-sm font-medium">Days off</h3>

                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  {profile.availability_exceptions.map((exception) => (
                    <li key={exception.id}>
                      {formatDate(exception.blocked_on)}
                      {exception.reason ? ` — ${exception.reason}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Areas covered</h2>

            {profile.service_areas.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {town
                  ? `${town} and the surrounding area.`
                  : "Coverage has not been published yet."}
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {profile.service_areas.map((area) => (
                  <li key={area.id}>
                    <Badge>{area.label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold tracking-tight">Track record</h2>

            <dl className="mt-3 flex flex-col gap-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Rating</dt>
                <dd className="font-medium">
                  {profile.rating_count > 0
                    ? `${profile.rating_avg.toFixed(1)} from ${profile.rating_count} review${
                        profile.rating_count === 1 ? "" : "s"
                      }`
                    : "No reviews yet"}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Jobs completed</dt>
                <dd className="font-medium">{profile.completed_jobs_count}</dd>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">Services offered</dt>
                <dd className="font-medium">{profile.services.length}</dd>
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">On HomeFix since</dt>
                <dd className="font-medium">{formatDate(profile.created_at)}</dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/**
 * "KSh 1,500 – KSh 4,000", or a single figure when the professional quoted one.
 *
 * A quote-only service has neither bound, and inventing "KSh 0" there would be a
 * lie about the price — so it says what it is.
 */
function priceRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Price on request";

  if (min !== null && max !== null && min !== max) {
    return `${formatMoney(min)} – ${formatMoney(max)}`;
  }

  return formatMoney(min ?? max);
}
