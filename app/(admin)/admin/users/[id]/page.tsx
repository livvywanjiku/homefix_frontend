import type { Metadata } from "next";
import Link from "next/link";
import { KeyValue, NoAccess, PageIntro, Panel, Pill, statusPillTone } from "@/components/admin/ui";
import { can, ROLE_OPTIONS, type AdminUserRow } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { UserStatusForm } from "./status-form";

export const metadata: Metadata = { title: "Account" };

/** The professional profile that hangs off this account, when it has one. */
type ProfileSummary = {
  id: number;
  business_name: string | null;
  verification_status: string;
  verification_label: string;
  is_verified: boolean;
  verified_at: string | null;
  rating_avg: number;
  rating_count: number;
  completed_jobs_count: number;
  base_location?: { id: number; name: string; region: string | null } | null;
};

type UserDetail = {
  user: AdminUserRow;
  professional_profile: ProfileSummary | null;
  activity: {
    service_requests: number;
    bookings_as_customer: number;
    bookings_as_professional: number;
    quotations: number;
  };
};

/**
 * One account.
 *
 * Everything here is either the account's own record or a count of what it has
 * done — deliberately counts rather than lists. This screen exists to answer
 * "should this account be suspended?", and that question needs context, not a
 * second place to browse bookings from.
 */
export default async function AdminUserPage(props: PageProps<"/admin/users/[id]">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_users")) {
    return <NoAccess permission="view_users" />;
  }

  const { id } = await props.params;
  const detail = await apiFetch<UserDetail>(`/admin/users/${id}`, { token: session.token });
  const user = detail.user;

  const roleLabel = user.role
    ? (ROLE_OPTIONS.find((option) => option.value === user.role)?.label ?? user.role)
    : "No role";

  // Suspending yourself is refused by the API; saying so here is kinder than
  // letting an administrator press the button to find out.
  const isSelf = user.id === account.id;

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            <Link href="/admin/users" className="hover:text-admin-accent">
              ← All accounts
            </Link>
          </>
        }
      >
        <Pill tone={statusPillTone(user.status)}>{user.status}</Pill>
      </PageIntro>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Account" className="lg:col-span-2">
          <dl className="grid gap-5 sm:grid-cols-2">
            <KeyValue label="Name">{user.name}</KeyValue>
            <KeyValue label="Role">{roleLabel}</KeyValue>
            <KeyValue label="Email">
              <a href={`mailto:${user.email}`} className="hover:text-admin-accent">
                {user.email}
              </a>
            </KeyValue>
            <KeyValue label="Phone">
              {user.phone ? (
                <a href={`tel:${user.phone}`} className="hover:text-admin-accent">
                  {user.phone}
                </a>
              ) : (
                <span className="text-admin-muted">Not given</span>
              )}
            </KeyValue>
            <KeyValue label="Email verified">
              {user.email_verified_at ? formatDateTime(user.email_verified_at) : "Not verified"}
            </KeyValue>
            <KeyValue label="Registered">{formatDate(user.created_at)}</KeyValue>
          </dl>
        </Panel>

        <Panel title="Activity" description="What this account has done on the platform.">
          <dl className="grid grid-cols-2 gap-5">
            <KeyValue label="Requests posted">{detail.activity.service_requests}</KeyValue>
            <KeyValue label="Bookings as customer">
              {detail.activity.bookings_as_customer}
            </KeyValue>
            <KeyValue label="Jobs taken">{detail.activity.bookings_as_professional}</KeyValue>
            <KeyValue label="Quotations sent">{detail.activity.quotations}</KeyValue>
          </dl>
        </Panel>
      </div>

      {detail.professional_profile ? (
        <Panel
          title="Professional profile"
          description="This account also trades as a professional."
          action={
            can(account.permissions, "view_professionals") ? (
              <Link
                href={`/admin/professionals/${detail.professional_profile.id}`}
                className="text-xs font-medium text-admin-accent hover:underline"
              >
                Open the profile
              </Link>
            ) : null
          }
        >
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KeyValue label="Trading name">
              {detail.professional_profile.business_name ?? "Not set"}
            </KeyValue>
            <KeyValue label="Verification">
              <Pill
                tone={detail.professional_profile.is_verified ? "success" : "warning"}
              >
                {detail.professional_profile.verification_label}
              </Pill>
            </KeyValue>
            <KeyValue label="Rating">
              {detail.professional_profile.rating_count === 0
                ? "No ratings yet"
                : `${detail.professional_profile.rating_avg} from ${detail.professional_profile.rating_count}`}
            </KeyValue>
            <KeyValue label="Jobs completed">
              {detail.professional_profile.completed_jobs_count}
            </KeyValue>
            <KeyValue label="Base location">
              {detail.professional_profile.base_location?.name ?? "Not set"}
            </KeyValue>
            <KeyValue label="Verified at">
              {detail.professional_profile.verified_at
                ? formatDateTime(detail.professional_profile.verified_at)
                : "—"}
            </KeyValue>
          </dl>
        </Panel>
      ) : null}

      {can(account.permissions, "suspend_users") ? (
        <Panel
          title="Account status"
          description="Reinstating clears the suspension and its reason; both are recorded in the audit log."
        >
          {isSelf ? (
            <p className="rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-4 text-sm text-admin-muted">
              This is your own account. An administrator cannot suspend themselves — the API refuses
              it, because it is the one action that could lock the platform&apos;s operator out of
              the screen they would use to undo it.
            </p>
          ) : (
            <div className="max-w-xl">
              <UserStatusForm id={user.id} status={user.status} />
            </div>
          )}
        </Panel>
      ) : (
        <Panel title="Account status">
          <p className="text-sm text-admin-muted">
            Changing an account&apos;s status requires the{" "}
            <span className="font-medium text-admin-text">suspend_users</span> permission, which
            your role does not hold.
          </p>
        </Panel>
      )}
    </div>
  );
}
