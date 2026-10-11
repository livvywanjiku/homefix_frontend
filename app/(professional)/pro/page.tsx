import type { Metadata } from "next";
import Link from "next/link";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/components/ui/rating-stars";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { requireRole } from "@/lib/dal";
import { formatMoney } from "@/lib/format";
import { getDashboard, getMyProfile } from "@/lib/professional";

export const metadata: Metadata = { title: "Professional dashboard" };

/** A step of the setup checklist, with whether it is done and where it lives. */
function Step({
  done,
  title,
  description,
  href,
  action,
}: {
  done: boolean;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? "bg-success-50 text-success" : "bg-surface text-muted-foreground"
        }`}
      >
        {done ? "✓" : "○"}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>

      {done ? (
        <Badge tone="success">Done</Badge>
      ) : (
        <Link href={href} className="text-sm font-medium text-brand hover:underline">
          {action}
        </Link>
      )}
    </li>
  );
}

export default async function ProfessionalDashboardPage() {
  const session = await requireRole("professional");
  const profile = await getMyProfile(session.token);

  /*
   * A professional who has not saved a profile yet has no dashboard to show —
   * `/professional/dashboard` would 404, because every figure on it is a fact
   * about a profile that does not exist. Onboarding is the honest screen here.
   */
  if (profile === null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to HomeFix Connect</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up your profile and you can start receiving job requests from customers.
        </p>

        <div className="mt-8">
          <EmptyState
            title="Your profile is not set up yet"
            description="Tell customers who you are, what you do and where you work. It takes about five minutes, and you can edit any of it later."
            action={
              <ButtonLink href="/pro/profile" variant="accent">
                Set up your profile
              </ButtonLink>
            }
          />
        </div>
      </div>
    );
  }

  const dashboard = await getDashboard(session.token);

  const hasServices = dashboard.active_services_count > 0;
  const hasAreas = dashboard.service_areas_count > 0;
  const hasHours = profile.availabilities.length > 0;
  const hasDocuments = dashboard.documents_count > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.business_name}</h1>
          <p className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={dashboard.verification_status} />
            {dashboard.is_listed ? (
              <span>Visible to customers in search</span>
            ) : (
              <span>Not yet visible to customers</span>
            )}
          </p>
        </div>

        <ButtonLink href={`/professionals/${profile.id}`} variant="secondary">
          View public profile
        </ButtonLink>
      </div>

      {/*
       * A rejection is the one status that needs its reason on the screen: the
       * professional cannot act on "rejected" without knowing what to fix.
       */}
      {dashboard.verification_status === "rejected" && dashboard.verification_notes ? (
        <Card className="border-danger/30 bg-danger-50/50 dark:bg-danger/10">
          <CardHeader className="border-danger/20">
            <CardTitle>Why your application was not approved</CardTitle>
            <Link
              href="/pro/verification"
              className="text-sm font-medium text-brand hover:underline"
            >
              Fix and resubmit
            </Link>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-foreground">{dashboard.verification_notes}</p>
          </CardBody>
        </Card>
      ) : null}

      <StatGrid>
        <StatTile
          label="Rating"
          value={<RatingStars value={dashboard.rating_avg} count={dashboard.rating_count} />}
          hint={`${dashboard.rating_count} review${dashboard.rating_count === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Jobs completed"
          value={dashboard.completed_jobs_count}
          tone="success"
        />
        <StatTile
          label="Live services"
          value={dashboard.active_services_count}
          tone="brand"
        />
        <StatTile
          label="From price"
          value={profile.from_price_cents ? formatMoney(profile.from_price_cents) : "Quote"}
          hint="Your cheapest advertised price"
        />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Getting listed</CardTitle>
          <span className="text-sm text-muted-foreground">
            {[hasServices, hasAreas, hasHours, hasDocuments].filter(Boolean).length} of 4 done
          </span>
        </CardHeader>

        <CardBody>
          <ul className="divide-y divide-line">
            <Step
              done={hasServices}
              title="Add the services you offer"
              description="Customers search by service, so each one you add is another way to be found."
              href="/pro/services"
              action="Add services"
            />
            <Step
              done={hasAreas}
              title="Choose the towns you cover"
              description="Requests are matched to professionals who work in the customer's area."
              href="/pro/profile"
              action="Set areas"
            />
            <Step
              done={hasHours}
              title="Set your working hours"
              description="Your weekly pattern tells customers when they can book you."
              href="/pro/availability"
              action="Set hours"
            />
            <Step
              done={hasDocuments}
              title="Upload your identification"
              description="A national ID is required. Certificates and licences help you stand out."
              href="/pro/verification"
              action="Upload"
            />
          </ul>
        </CardBody>
      </Card>

      {dashboard.verification_status === "pending" ? (
        <p className="text-sm text-muted-foreground">
          Your application is in the review queue. Verification normally takes one working day.
        </p>
      ) : null}
    </div>
  );
}
