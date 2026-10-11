import type { Metadata } from "next";
import Link from "next/link";
import { DocumentReviewControls, VerificationDecisionForm } from "@/components/admin/review";
import {
  EmptyPanel,
  KeyValue,
  LinkChip,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
  statusPillTone,
} from "@/components/admin/ui";
import { Pagination } from "@/components/ui/pagination";
import { VERIFICATION_STATUS_OPTIONS, can } from "@/lib/admin";
import { currentAdmin, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import type { Paginated, ProfessionalProfile } from "@/lib/types";

export const metadata: Metadata = { title: "Professional Verification" };

/**
 * The verification queue.
 *
 * The decisions are made here rather than one navigation away, because the
 * endpoint behind this screen requires only `verify_professional` — a reviewer
 * who holds that and not `view_professionals` can still do their job. The
 * directory at `/admin/professionals` is the other question ("who is on the
 * platform") and is deliberately gated separately.
 *
 * The default view is the work still to do — applications waiting and ones sent
 * back for correction — because a queue that opened on everything already
 * decided would bury the four rows that need someone.
 */
export default async function AdminVerificationPage(props: PageProps<"/admin/verification">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "verify_professional")) {
    return <NoAccess permission="verify_professional" />;
  }

  const params = await props.searchParams;
  const status = one(params.status);
  const page = one(params.page);

  const applications = await apiFetch<Paginated<ProfessionalProfile>>(
    "/admin/professionals/verification-queue",
    {
      token: session.token,
      search: { ...(status ? { status } : {}), ...(page ? { page } : {}) },
    },
  );

  const href = (next?: string) => (next ? `/admin/verification?status=${next}` : "/admin/verification");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {applications.meta.total.toLocaleString()} application
            {applications.meta.total === 1 ? "" : "s"} in this view. Verifying a professional makes
            them searchable and bookable; a rejection or suspension needs a reason they can act on.
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <LinkChip href={href()} active={status === undefined}>
          Awaiting review
        </LinkChip>
        {VERIFICATION_STATUS_OPTIONS.map((option) => (
          <LinkChip key={option.value} href={href(option.value)} active={status === option.value}>
            {option.label}
          </LinkChip>
        ))}
      </div>

      {applications.data.length === 0 ? (
        <Panel>
          <EmptyPanel
            label={
              status === undefined
                ? "Nothing is waiting for a decision. Applications sent back for correction appear here too."
                : "No application is in that state."
            }
          />
        </Panel>
      ) : (
        <div className="flex flex-col gap-5">
          {applications.data.map((application) => (
            <Panel
              key={application.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {application.business_name}
                  <Pill tone={statusPillTone(application.verification_status)}>
                    {application.verification_label}
                  </Pill>
                </span>
              }
              description={
                <>
                  {application.user?.name ?? "Unknown applicant"} · applied{" "}
                  {formatRelative(application.created_at)}
                </>
              }
              action={
                can(account.permissions, "view_professionals") ? (
                  <Link
                    href={`/admin/professionals/${application.id}`}
                    className="text-xs font-medium text-admin-accent hover:underline"
                  >
                    Full profile
                  </Link>
                ) : null
              }
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-5">
                  <dl className="grid grid-cols-2 gap-4">
                    <KeyValue label="Base location">
                      {application.base_location?.label ?? (
                        <span className="text-admin-muted">Not set</span>
                      )}
                    </KeyValue>
                    <KeyValue label="Experience">
                      {application.experience_years === null
                        ? "Not stated"
                        : `${application.experience_years} yr`}
                    </KeyValue>
                    <KeyValue label="Services offered">{application.services_count ?? 0}</KeyValue>
                    <KeyValue label="Documents">{application.documents_count ?? 0}</KeyValue>
                    <KeyValue label="Contact">
                      {application.user?.email ? (
                        <a
                          href={`mailto:${application.user.email}`}
                          className="hover:text-admin-accent"
                        >
                          {application.user.email}
                        </a>
                      ) : (
                        <span className="text-admin-muted">Not shown</span>
                      )}
                    </KeyValue>
                    <KeyValue label="Telephone">
                      {application.user?.phone ?? (
                        <span className="text-admin-muted">Not given</span>
                      )}
                    </KeyValue>
                  </dl>

                  <div>
                    <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
                      Submitted
                    </p>
                    <p className="mt-1 text-sm">{formatDateTime(application.created_at)}</p>
                  </div>

                  {application.verification_notes ? (
                    <div className="rounded-lg border border-admin-border bg-admin-surface/60 px-4 py-3">
                      <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
                        Previous note
                      </p>
                      <p className="mt-1 text-sm">{application.verification_notes}</p>
                    </div>
                  ) : null}

                  {application.about ? (
                    <div>
                      <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
                        About
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-line">{application.about}</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <p className="mb-2 text-xs font-medium tracking-wide text-admin-muted uppercase">
                      Documents
                    </p>
                    {!application.documents || application.documents.length === 0 ? (
                      <EmptyPanel label="No documents were uploaded with this application." />
                    ) : (
                      <ul className="flex flex-col divide-y divide-admin-border rounded-lg border border-admin-border">
                        {application.documents.map((document) => (
                          <li key={document.id} className="flex flex-col gap-2 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium">{document.type_label}</span>
                              <Pill tone={statusPillTone(document.status)}>
                                {document.status_label}
                              </Pill>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
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
                                <span className="text-admin-muted">No file attached</span>
                              )}
                              {document.notes ? (
                                <span className="text-danger">{document.notes}</span>
                              ) : null}
                            </div>
                            {document.url ? (
                              <DocumentReviewControls
                                documentId={document.id}
                                professionalId={application.id}
                                status={document.status}
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border border-admin-border bg-admin-surface/40 px-4 py-4">
                    <p className="mb-3 text-xs font-medium tracking-wide text-admin-muted uppercase">
                      Decision
                    </p>
                    <VerificationDecisionForm
                      id={application.id}
                      currentStatus={application.verification_status}
                    />
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Pagination links={paginationLinks(applications, "/admin/verification")} />
    </div>
  );
}
