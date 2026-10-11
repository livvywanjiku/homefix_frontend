import Link from "next/link";
import type { Metadata } from "next";
import { DashboardHero } from "@/components/dashboard-hero";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { apiFetch } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import { formatRelative } from "@/lib/format";
import { countServiceRequests, getMyServiceRequests } from "@/lib/requests";

export const metadata: Metadata = { title: "Dashboard" };

type MeResponse = { data: { name: string } };

/**
 * The customer's home (spec §3).
 *
 * Every figure on this page comes from the API — there are no placeholder
 * numbers, and a customer with nothing posted sees their own zeroes and an
 * empty state rather than a mock-up of activity they have not had.
 */
export default async function CustomerDashboardPage() {
  // The authoritative gate. `proxy.ts` also redirects here, but it only reads
  // the cookie and never talks to Laravel, so it cannot be the check that counts.
  const session = await requireRole("customer");

  const [me, open, quoted, awarded, recent] = await Promise.all([
    apiFetch<MeResponse>("/auth/me", { token: session.token }),
    countServiceRequests(session.token, "open"),
    countServiceRequests(session.token, "quoted"),
    countServiceRequests(session.token, "awarded"),
    getMyServiceRequests(session.token, { per_page: 5 }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <DashboardHero
        eyebrow="Your dashboard"
        title={`Welcome back, ${me.data.name}`}
        description="Post a job, compare quotes, and track what you have booked."
        action={
          <ButtonLink href="/dashboard/requests/new" variant="accent">
            Post a job
          </ButtonLink>
        }
      />

      <StatGrid>
        <StatTile label="Open" value={open} hint="Waiting for quotes" tone="brand" />
        <StatTile label="Quoted" value={quoted} hint="Ready to compare" tone="accent" />
        <StatTile label="Awarded" value={awarded} hint="Work agreed" tone="success" />
        <StatTile label="All requests" value={recent.meta.total} hint="Everything you have posted" />
      </StatGrid>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold tracking-tight">Recent requests</h2>

          {recent.meta.total > 0 ? (
            <Link
              href="/dashboard/requests"
              className="text-sm font-medium text-brand hover:underline"
            >
              See all
            </Link>
          ) : null}
        </div>

        {recent.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No requests yet"
              description="Describe what needs fixing and verified professionals covering your town will send you quotes."
              action={
                <ButtonLink href="/dashboard/requests/new">Post your first job</ButtonLink>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {recent.data.map((request) => (
              <li key={request.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/requests/${request.id}`}
                        className="font-medium text-foreground hover:text-brand"
                      >
                        {request.title}
                      </Link>
                      <StatusBadge status={request.status} />
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {request.reference} · {formatRelative(request.created_at)}
                      {request.location ? ` · ${request.location.label}` : ""}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {request.quotes_count === 0
                      ? "No quotes yet"
                      : `${request.quotes_count} quote${request.quotes_count === 1 ? "" : "s"}`}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
