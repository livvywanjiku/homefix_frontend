import type { Metadata } from "next";
import Link from "next/link";
import { KeyValue, PageIntro, Panel, Pill } from "@/components/admin/ui";
import { ADMIN_ROLE_LABEL, can, visibleNav } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "My Profile" };

/** "view_audit_logs" → "View audit logs", the same wording `Permission::label()` produces. */
function permissionLabel(value: string): string {
  const words = value.replaceAll("_", " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/*
 * The signed-in administrator's own account.
 *
 * Everything on it is read from the API on every render rather than from the
 * cookie: the cookie holds an identity, but a permission revoked in the
 * database has to take effect at the next request, not at the next sign-in.
 * That is why the access list below is the live grant list.
 *
 * There is deliberately no self-service edit form. Name, email and phone are
 * edited on the Administrators screen — the same record, the same validation,
 * one write path — and a password change has no endpoint at all yet, so
 * offering a form here would be offering something that cannot succeed.
 *
 * There is no permission gate either, beyond the administrative role the shell
 * already requires: a page about your own account is not a section of the
 * console, and an administrator who holds a single grant must still be able to
 * see who they are signed in as.
 */
export default async function AdminProfilePage() {
  const { session, account } = await currentAdmin();

  const sections = visibleNav(account.permissions);
  const permissions = [...account.permissions].sort();
  const mayEditOwnRecord = can(account.permissions, "manage_administrators");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            Signed in as {account.name}. This is your own record — the access listed below is read
            live from the database on every page load, so a permission granted or revoked elsewhere
            applies here immediately.
          </>
        }
      >
        {mayEditOwnRecord ? (
          <Link
            href="/admin/administrators"
            className="text-xs font-medium text-admin-accent hover:underline"
          >
            Edit my details
          </Link>
        ) : null}
      </PageIntro>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Identity">
          <dl className="grid gap-4 sm:grid-cols-2">
            <KeyValue label="Name">{account.name}</KeyValue>
            <KeyValue label="Email">
              <span className="break-all">{account.email}</span>
            </KeyValue>
            <KeyValue label="Roles">
              <span className="flex flex-wrap gap-1.5">
                {account.roles.map((role) => (
                  <Pill key={role} tone="accent">
                    {ADMIN_ROLE_LABEL[role] ?? role}
                  </Pill>
                ))}
              </span>
            </KeyValue>
            <KeyValue label="Account number">
              <span className="font-mono text-xs">#{account.id}</span>
            </KeyValue>
          </dl>
        </Panel>

        <Panel title="Session">
          <dl className="grid gap-4 sm:grid-cols-2">
            <KeyValue label="Session expires">
              {formatDateTime(new Date(session.expiresAt * 1000).toISOString())}
              <p className="text-xs text-admin-muted">
                {formatRelative(new Date(session.expiresAt * 1000).toISOString())}
              </p>
            </KeyValue>
            <KeyValue label="Granted permissions">
              {permissions.length}
              <p className="text-xs text-admin-muted">
                across {sections.length} section{sections.length === 1 ? "" : "s"} of the console
              </p>
            </KeyValue>
          </dl>

          <p className="mt-4 text-xs text-admin-muted">
            Changing your own role is refused by the API, by design: an administrator who can widen
            their own access can grant themselves anything, and the audit trail would record a
            decision made by its own beneficiary. Ask another super administrator.
          </p>
        </Panel>
      </div>

      <Panel
        title="What you can open"
        description="Derived from your grant list — the same test the sidebar uses, so the two cannot disagree."
      >
        <div className="flex flex-col gap-4">
          {sections.map((group) => (
            <div key={group.key}>
              <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
                {group.label}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="inline-flex rounded-md border border-admin-border px-2.5 py-1 text-xs font-medium hover:border-admin-accent hover:text-admin-accent"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Every permission held"
        description={`${permissions.length} in total, in the order the API returns them.`}
      >
        <ul className="flex flex-wrap gap-1.5">
          {permissions.map((permission) => (
            <li key={permission}>
              <span
                title={permission}
                className="inline-flex rounded-md border border-admin-border bg-admin-surface/60 px-2 py-1 text-xs text-admin-muted"
              >
                {permissionLabel(permission)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
