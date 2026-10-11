import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyPanel, KeyValue, NoAccess, PageIntro, Panel, Pill } from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { auditPillTone, auditSubjectLabel, can, type AdminLogRow } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Audit entry" };

/*
 * One entry of the trail, with everything else that happened to the same record.
 *
 * The context is the point: a single line saying "Suspended" is unreadable
 * without the two decisions around it, and the API returns up to twenty of them
 * alongside the entry for exactly this screen.
 */
export default async function AdminAuditLogPage(props: PageProps<"/admin/audit-logs/[id]">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_audit_logs")) {
    return <NoAccess permission="view_audit_logs" />;
  }

  const { id } = await props.params;

  let payload: { entry: AdminLogRow; related: AdminLogRow[] };

  try {
    payload = await apiFetch<{ entry: AdminLogRow; related: AdminLogRow[] }>(
      `/admin/audit-logs/${id}`,
      { token: session.token },
    );
  } catch (error) {
    // A missing entry is a 404 from Laravel; anything else is a real failure and
    // belongs in the error boundary rather than being disguised as "not found".
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { entry, related } = payload;
  const metadata = entry.metadata ?? {};
  const hasMetadata = Object.keys(metadata).length > 0;

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={auditPillTone(entry.tone)}>{entry.action_label}</Pill>
            {entry.description ? <span>{entry.description}</span> : null}
          </span>
        }
      >
        <Link
          href="/admin/audit-logs"
          className="text-xs font-medium text-admin-accent hover:underline"
        >
          Back to the trail
        </Link>
      </PageIntro>

      <Panel title="The entry">
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <KeyValue label="Action">
            <span className="font-mono text-xs">{entry.action}</span>
          </KeyValue>

          <KeyValue label="Administrator">
            {entry.actor ? (
              <Link href={`/admin/users/${entry.actor.id}`} className="hover:text-admin-accent">
                {entry.actor.name}
              </Link>
            ) : (
              <span className="text-admin-muted">Recorded without an actor</span>
            )}
          </KeyValue>

          <KeyValue label="When">
            {formatDateTime(entry.created_at)}
            <span className="ml-2 text-xs text-admin-muted">
              {formatRelative(entry.created_at)}
            </span>
          </KeyValue>

          <KeyValue label="Subject">
            {entry.subject ? (
              <>
                {auditSubjectLabel(entry.subject.type)}
                {entry.subject.id === null ? null : (
                  <span className="text-admin-muted"> #{entry.subject.id}</span>
                )}
                <p className="font-mono text-xs text-admin-muted">{entry.subject.type}</p>
              </>
            ) : (
              <span className="text-admin-muted">Not attached to one record</span>
            )}
          </KeyValue>

          <KeyValue label="IP address">
            <span className="font-mono text-xs">{entry.ip_address ?? "—"}</span>
          </KeyValue>

          <KeyValue label="User agent">
            <span className="text-xs break-all text-admin-muted">{entry.user_agent ?? "—"}</span>
          </KeyValue>
        </dl>
      </Panel>

      {/*
        The before/after pairs an audit entry records. Rendered as JSON because
        the shape differs per action — a permission change has a list, a setting
        change has scalars — and inventing a per-action table for each would be
        pretending to a structure the data does not have.
      */}
      <Panel
        title="What changed"
        description="The values the action recorded, as the API stored them."
      >
        {hasMetadata ? (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Field</TH>
                  <TH>Value</TH>
                </TR>
              </THead>
              <TBody>
                {Object.entries(metadata).map(([key, value]) => (
                  <TR key={key}>
                    <TD className="align-top font-mono text-xs whitespace-nowrap">{key}</TD>
                    <TD className="font-mono text-xs break-words">
                      {value === null || value === undefined ? (
                        <span className="text-admin-muted">—</span>
                      ) : typeof value === "string" || typeof value === "number" ? (
                        String(value)
                      ) : (
                        JSON.stringify(value)
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : (
          <EmptyPanel label="This action recorded no field changes." />
        )}
      </Panel>

      <Panel
        title="The same record, other decisions"
        description="Up to twenty other entries about the same subject, newest first."
      >
        {related.length === 0 ? (
          <EmptyPanel label="Nothing else has been recorded against this record." />
        ) : (
          <ol className="flex flex-col gap-3">
            {related.map((other) => (
              <li key={other.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Pill tone={auditPillTone(other.tone)}>{other.action_label}</Pill>
                <Link
                  href={`/admin/audit-logs/${other.id}`}
                  className="text-sm font-medium hover:text-admin-accent"
                >
                  {other.description ?? other.action_label}
                </Link>
                <span className="text-xs text-admin-muted">
                  {other.actor?.name ?? "No actor"} · {formatRelative(other.created_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
