import type { Metadata } from "next";
import Link from "next/link";
import { DocumentReviewControls, VerificationDecisionForm } from "@/components/admin/review";
import {
  EmptyPanel,
  KeyValue,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
  statusPillTone,
} from "@/components/admin/ui";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, formatRelative } from "@/lib/format";
import type { Item, ProfessionalProfile } from "@/lib/types";
import { ListingStatusForm, SuspendAccountForm } from "./status-form";

export const metadata: Metadata = { title: "Professional" };

/**
 * One professional's record.
 *
 * Read-only except for the three decisions an administrator can make about
 * them — the verification verdict, the listing's suspension, and the account
 * behind it — each shown only to an account holding the permission its own API
 * route requires. The rest of the page is what a decision needs: who they are,
 * what they offer, and the evidence they uploaded, with the documents openable
 * so a review is a review and not a rubber stamp.
 */
export default async function AdminProfessionalPage(props: PageProps<"/admin/professionals/[id]">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_professionals")) {
    return <NoAccess permission="view_professionals" />;
  }

  const { id } = await props.params;
  const { data: professional } = await apiFetch<Item<ProfessionalProfile>>(
    `/admin/professionals/${id}`,
    { token: session.token },
  );

  const mayManage = can(account.permissions, "manage_professionals");
  const mayReview = can(account.permissions, "verify_professional");
  const maySuspendAccount = mayManage && can(account.permissions, "suspend_users");

  const unapproved = professional.documents?.filter((document) => document.status !== "verified") ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            <Link href="/admin/professionals" className="hover:text-admin-accent">
              ← Professional directory
            </Link>
            {professional.user?.id ? (
              <>
                {" · "}
                <Link href={`/admin/users/${professional.user.id}`} className="hover:text-admin-accent">
                  Open the account
                </Link>
              </>
            ) : null}
          </>
        }
      >
        <Pill tone={statusPillTone(professional.verification_status)}>
          {professional.verification_label}
        </Pill>
        {professional.from_price_cents !== undefined && professional.from_price_cents !== null ? (
          <Pill>From {formatMoney(professional.from_price_cents)}</Pill>
        ) : null}
      </PageIntro>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Profile" className="lg:col-span-2">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <KeyValue label="Trading name">{professional.business_name}</KeyValue>
            <KeyValue label="Account holder">{professional.user?.name ?? "—"}</KeyValue>
            <KeyValue label="Experience">
              {professional.experience_years === null
                ? "Not stated"
                : `${professional.experience_years} year${professional.experience_years === 1 ? "" : "s"}`}
            </KeyValue>
            <KeyValue label="Email">
              {professional.user?.email ? (
                <a href={`mailto:${professional.user.email}`} className="hover:text-admin-accent">
                  {professional.user.email}
                </a>
              ) : (
                <span className="text-admin-muted">Not shown</span>
              )}
            </KeyValue>
            <KeyValue label="Account phone">
              {professional.user?.phone ? (
                <a href={`tel:${professional.user.phone}`} className="hover:text-admin-accent">
                  {professional.user.phone}
                </a>
              ) : (
                <span className="text-admin-muted">Not given</span>
              )}
            </KeyValue>
            <KeyValue label="Business phone">
              {professional.phone ?? <span className="text-admin-muted">Not given</span>}
            </KeyValue>
            <KeyValue label="Base location">
              {professional.base_location?.label ?? <span className="text-admin-muted">Not set</span>}
            </KeyValue>
            <KeyValue label="Verified at">
              {professional.verified_at ? formatDateTime(professional.verified_at) : "—"}
            </KeyValue>
            <KeyValue label="Joined">{formatDate(professional.created_at)}</KeyValue>
            <KeyValue label="Rating">
              {professional.rating_count === 0
                ? "No ratings yet"
                : `${professional.rating_avg.toFixed(1)} from ${professional.rating_count}`}
            </KeyValue>
            <KeyValue label="Jobs completed">{professional.completed_jobs_count}</KeyValue>
            <KeyValue label="Services offered">
              {professional.services_count ?? professional.services.length}
            </KeyValue>
          </dl>

          {professional.verification_notes ? (
            <div className="mt-5 rounded-lg border border-admin-border bg-admin-surface/60 px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
                Verification note
              </p>
              <p className="mt-1 text-sm">{professional.verification_notes}</p>
            </div>
          ) : null}

          {professional.about ? (
            <div className="mt-5">
              <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">About</p>
              <p className="mt-1 text-sm whitespace-pre-line">{professional.about}</p>
            </div>
          ) : null}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Service areas">
            {professional.service_areas.length === 0 ? (
              <EmptyPanel label="No service areas are set, so this professional only appears in searches for their base location." />
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {professional.service_areas.map((area) => (
                  <li key={area.id}>
                    <Pill>{area.label}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Documents"
        description={
          unapproved.length === 0
            ? "Everything uploaded has been approved."
            : `${unapproved.length} document${unapproved.length === 1 ? "" : "s"} not yet approved.`
        }
        bodyClassName={professional.documents?.length ? "divide-y divide-admin-border" : "px-5 py-5"}
      >
        {!professional.documents || professional.documents.length === 0 ? (
          <EmptyPanel label="This professional has not uploaded any documents." />
        ) : (
          professional.documents.map((document) => (
            <div key={document.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{document.type_label}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-admin-muted">
                  <Pill tone={statusPillTone(document.status)}>{document.status_label}</Pill>
                  {document.reviewed_at ? <span>Reviewed {formatRelative(document.reviewed_at)}</span> : null}
                  {document.url ? (
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-admin-accent hover:underline"
                    >
                      Open the file
                    </a>
                  ) : (
                    <span>No file attached</span>
                  )}
                </p>
                {document.notes ? (
                  <p className="mt-2 text-xs text-danger">{document.notes}</p>
                ) : null}
              </div>

              {mayReview && document.url ? (
                <div className="w-full max-w-sm">
                  <DocumentReviewControls
                    documentId={document.id}
                    professionalId={professional.id}
                    status={document.status}
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
      </Panel>

      <Panel
        title="Services and pricing"
        description="What this professional offers, as customers see it."
        bodyClassName={professional.services.length ? "divide-y divide-admin-border" : "px-5 py-5"}
      >
        {professional.services.length === 0 ? (
          <EmptyPanel label="No services have been added to this profile." />
        ) : (
          professional.services.map((offering) => (
            <div
              key={offering.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{offering.service?.name ?? "Unknown service"}</p>
                {offering.description ? (
                  <p className="mt-0.5 text-xs text-admin-muted">{offering.description}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="tabular-nums">
                  {offering.price_min_cents === null
                    ? offering.pricing_label
                    : offering.price_max_cents !== null &&
                        offering.price_max_cents !== offering.price_min_cents
                      ? `${formatMoney(offering.price_min_cents)} – ${formatMoney(offering.price_max_cents)}`
                      : formatMoney(offering.price_min_cents)}
                </span>
                <Pill tone={offering.is_active ? "success" : "neutral"}>
                  {offering.is_active ? "Offered" : "Withdrawn"}
                </Pill>
              </div>
            </div>
          ))
        )}
      </Panel>

      {mayReview ? (
        <Panel
          title="Verification decision"
          description="Applies the platform's trust verdict. Every decision is recorded against your account."
        >
          <div className="max-w-2xl">
            <VerificationDecisionForm id={professional.id} currentStatus={professional.verification_status} />
          </div>
        </Panel>
      ) : null}

      {mayManage ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="Listing"
            description="Whether customers can find and book this professional."
          >
            <ListingStatusForm id={professional.id} status={professional.verification_status} />
          </Panel>

          <Panel
            title="Account"
            description="The sign-in behind the profile — a heavier action than suspending the listing."
          >
            {maySuspendAccount ? (
              <SuspendAccountForm id={professional.id} />
            ) : (
              <p className="text-sm text-admin-muted">
                Suspending the account behind a profile also requires the{" "}
                <span className="font-medium text-admin-text">suspend_users</span> permission, which
                your role does not hold. You can still suspend the listing.
              </p>
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
