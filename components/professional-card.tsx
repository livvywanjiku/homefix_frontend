import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RatingStars } from "@/components/ui/rating-stars";
import { formatFrom } from "@/lib/format";
import type { ProfessionalCard as ProfessionalCardData } from "@/lib/types";

/**
 * One professional in a search result list.
 *
 * Everything shown here is what the listing endpoint returned: the API decides
 * which fields a card carries, so this component cannot accidentally reveal a
 * phone number or a full address that the search response withheld.
 */
export function ProfessionalCard({ professional }: { professional: ProfessionalCardData }) {
  const town = professional.base_location?.label ?? professional.base_location?.name;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start gap-4">
        <Avatar src={professional.user?.avatar_url} name={professional.business_name} size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/professionals/${professional.id}`}
              className="truncate font-semibold tracking-tight text-foreground hover:text-brand"
            >
              {professional.business_name}
            </Link>

            {professional.is_verified ? <VerifiedBadge /> : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <RatingStars
              value={professional.rating_avg}
              count={professional.rating_count}
              size="sm"
            />

            {professional.completed_jobs_count > 0 ? (
              <span className="text-sm text-muted-foreground">
                {professional.completed_jobs_count} job
                {professional.completed_jobs_count === 1 ? "" : "s"} done
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {professional.about_excerpt ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {professional.about_excerpt}
        </p>
      ) : null}

      {professional.top_services && professional.top_services.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {professional.top_services.map((service) => (
            <li key={service.id}>
              <Badge>{service.name}</Badge>
            </li>
          ))}

          {(professional.services_count ?? 0) > professional.top_services.length ? (
            <li>
              <Badge>
                +{(professional.services_count ?? 0) - professional.top_services.length} more
              </Badge>
            </li>
          ) : null}
        </ul>
      ) : null}

      <dl className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4 text-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {town ? (
            <div>
              <dt className="text-xs text-muted-foreground">Based in</dt>
              <dd className="font-medium">{town}</dd>
            </div>
          ) : null}

          {professional.experience_years !== null ? (
            <div>
              <dt className="text-xs text-muted-foreground">Experience</dt>
              <dd className="font-medium">
                {professional.experience_years} year
                {professional.experience_years === 1 ? "" : "s"}
              </dd>
            </div>
          ) : null}

          {/*
            Only present when the search was measured from somewhere. It is a
            distance between towns, not a route, so it reads as approximate.
          */}
          {professional.distance_km !== undefined && professional.distance_km !== null ? (
            <div>
              <dt className="text-xs text-muted-foreground">Distance</dt>
              <dd className="font-medium">~{professional.distance_km} km away</dd>
            </div>
          ) : null}
        </div>

        <div className="text-right">
          <p className="font-semibold text-navy">{formatFrom(professional.from_price_cents)}</p>

          <Link
            href={`/professionals/${professional.id}`}
            className="text-xs font-medium text-brand hover:underline"
          >
            View profile
          </Link>
        </div>
      </dl>
    </Card>
  );
}
