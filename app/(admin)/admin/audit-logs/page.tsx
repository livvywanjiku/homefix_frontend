import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminInput,
  AdminSelect,
  EmptyPanel,
  FilterBar,
  FilterField,
  FilterSubmit,
  NoAccess,
  PageIntro,
  Panel,
  Pill,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  AUDIT_ACTION_OPTIONS,
  PAGE_SIZES,
  auditPillTone,
  auditSubjectLabel,
  can,
  type AdminLogRow,
} from "@/lib/admin";
import { currentAdmin, filters, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import type { Paginated } from "@/lib/types";

export const metadata: Metadata = { title: "Audit Logs" };

/*
 * The audit trail (spec §20).
 *
 * Read-only, and there is no endpoint anywhere that edits or deletes an entry —
 * a trail that can be amended by the people it records is not a trail. This page
 * therefore has no forms, only filters.
 *
 * The filters are the ones `ListAuditLogsRequest` validates. Nothing is filtered
 * in the browser: the query goes to Laravel, which is also why a trail of a
 * hundred thousand entries still renders in one page-load.
 */
export default async function AdminAuditLogsPage(props: PageProps<"/admin/audit-logs">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_audit_logs")) {
    return <NoAccess permission="view_audit_logs" />;
  }

  const params = await props.searchParams;
  const search = filters(params, ["q", "action", "user_id", "from", "to", "per_page"]);
  const page = one(params.page);
  if (page) search.page = page;

  const [logs, actors] = await Promise.all([
    apiFetch<Paginated<AdminLogRow>>("/admin/audit-logs", { token: session.token, search }),
    apiFetch<{ actors: { id: number; name: string }[] }>("/admin/audit-logs/actors", {
      token: session.token,
    }),
  ]);

  const filtered = Object.keys(search).some((key) => key !== "page" && key !== "per_page");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {logs.meta.total.toLocaleString()} recorded act
            {logs.meta.total === 1 ? "" : "s"}. The trail covers decisions — a suspension, a
            verification, a permission change — rather than reads, so that "who changed this" stays
            answerable. Entries are never edited or removed.
          </>
        }
      />

      <FilterBar action="/admin/audit-logs">
        <FilterField label="Search" className="min-w-[14rem] flex-1">
          <AdminInput
            type="search"
            name="q"
            defaultValue={one(params.q) ?? ""}
            placeholder="Description or IP address"
          />
        </FilterField>

        <FilterField label="Action">
          <AdminSelect name="action" defaultValue={one(params.action) ?? ""}>
            <option value="">Any action</option>
            {AUDIT_ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Administrator">
          <AdminSelect name="user_id" defaultValue={one(params.user_id) ?? ""}>
            <option value="">Anyone</option>
            {actors.actors.map((actor) => (
              <option key={actor.id} value={String(actor.id)}>
                {actor.name}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="From">
          <AdminInput type="date" name="from" defaultValue={one(params.from) ?? ""} />
        </FilterField>

        <FilterField label="To">
          <AdminInput type="date" name="to" defaultValue={one(params.to) ?? ""} />
        </FilterField>

        <FilterField label="Per page">
          <AdminSelect name="per_page" defaultValue={one(params.per_page) ?? "50"}>
            {PAGE_SIZES.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterSubmit>Apply</FilterSubmit>

        {filtered ? (
          <Link
            href="/admin/audit-logs"
            className="pb-2 text-xs font-medium text-admin-muted hover:text-admin-text"
          >
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Panel title="Trail" bodyClassName="">
        {logs.data.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel
              label={filtered ? "Nothing matches those filters." : "Nothing has been recorded yet."}
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Action</TH>
                <TH>What happened</TH>
                <TH className="hidden md:table-cell">Administrator</TH>
                <TH className="hidden lg:table-cell">From</TH>
                <TH>When</TH>
              </TR>
            </THead>
            <TBody>
              {logs.data.map((entry) => (
                <TR key={entry.id}>
                  <TD>
                    <Pill tone={auditPillTone(entry.tone)}>{entry.action_label}</Pill>
                  </TD>
                  <TD>
                    <Link
                      href={`/admin/audit-logs/${entry.id}`}
                      className="font-medium hover:text-admin-accent"
                    >
                      {entry.description ?? entry.action_label}
                    </Link>
                    {entry.subject ? (
                      <p className="text-xs text-admin-muted">
                        {auditSubjectLabel(entry.subject.type)}
                        {entry.subject.id === null ? "" : ` #${entry.subject.id}`}
                      </p>
                    ) : null}
                  </TD>
                  <TD className="hidden text-xs md:table-cell">
                    {entry.actor?.name ?? <span className="text-admin-muted">System</span>}
                  </TD>
                  <TD className="hidden font-mono text-xs text-admin-muted lg:table-cell">
                    {entry.ip_address ?? "—"}
                  </TD>
                  <TD className="text-xs text-admin-muted">
                    <span title={formatDateTime(entry.created_at)}>
                      {formatRelative(entry.created_at)}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pagination links={paginationLinks(logs, "/admin/audit-logs")} />
    </div>
  );
}
