import type { Metadata } from "next";
import { EmptyPanel, NoAccess, PageIntro, Panel, Pill } from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { ADMIN_ROLE_LABEL, can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import type { Paginated } from "@/lib/types";
import type { AdminUserRow } from "@/lib/admin";
import { AdministratorForm } from "./administrator-form";

export const metadata: Metadata = { title: "Administrators" };

/**
 * The administrator roster (spec §20).
 *
 * Reserved to `manage_administrators`, which the super administrator holds
 * alone — an administrator who could edit the roster could grant themselves
 * anything the roles screen offers, so the two permissions travel together.
 *
 * Editing is inline. The form has six fields and there are rarely more than a
 * handful of administrators; a route per row would be more navigation than
 * screen, and having the whole roster visible is how the last super
 * administrator is noticed rather than discovered.
 */
export default async function AdminAdministratorsPage(
  props: PageProps<"/admin/administrators">,
) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_administrators")) {
    return <NoAccess permission="manage_administrators" />;
  }

  const params = await props.searchParams;
  const search: Record<string, string> = {};
  if (typeof params.page === "string" && params.page !== "") search.page = params.page;

  const administrators = await apiFetch<Paginated<AdminUserRow>>("/admin/administrators", {
    token: session.token,
    search,
  });

  /*
   * The super administrator count is only claimed when the roster fits on one
   * page. `index()` paginates at fifty, so on a second page this count would
   * describe the page rather than the platform — and a number in an introduction
   * that quietly means something else is worse than no number.
   */
  const singlePage = administrators.meta.last_page <= 1;
  const supers = administrators.data.filter((row) => row.role === "superadmin").length;

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {administrators.meta.total} administrative account
            {administrators.meta.total === 1 ? "" : "s"}
            {singlePage ? (
              <>
                , of which {supers} can manage administrators, roles and settings
              </>
            ) : (
              <> across {administrators.meta.last_page} pages</>
            )}
            . Nobody can change their own role, and passwords are only replaced when a new one is
            typed.
          </>
        }
      />

      <Panel title="Add an administrator">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-admin-accent hover:underline">
            New administrator
          </summary>
          <div className="mt-4 max-w-3xl">
            <AdministratorForm />
          </div>
        </details>
      </Panel>

      <Panel title="Roster" bodyClassName="">
        {administrators.data.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel label="There are no administrative accounts." />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Administrator</TH>
                <TH className="hidden md:table-cell">Phone</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Added</TH>
                <TH>Edit</TH>
              </TR>
            </THead>
            <TBody>
              {administrators.data.map((row) => {
                const self = row.id === account.id;

                return (
                  <TR key={row.id}>
                    <TD>
                      <span className="font-medium">{row.name}</span>
                      {self ? (
                        <span className="ml-2 align-middle">
                          <Pill tone="accent">You</Pill>
                        </span>
                      ) : null}
                      <p className="text-xs text-admin-muted">{row.email}</p>
                    </TD>
                    <TD className="hidden text-xs md:table-cell">
                      {row.phone ?? <span className="text-admin-muted">—</span>}
                    </TD>
                    <TD>
                      <Pill tone={row.role === "superadmin" ? "accent" : "neutral"}>
                        {ADMIN_ROLE_LABEL[row.role ?? ""] ?? "Administrator"}
                      </Pill>
                    </TD>
                    <TD>
                      <Pill tone={row.status === "active" ? "success" : "danger"}>
                        {row.status === "active" ? "Active" : "Suspended"}
                      </Pill>
                    </TD>
                    <TD className="hidden text-xs text-admin-muted lg:table-cell">
                      {formatDate(row.created_at)}
                    </TD>
                    <TD>
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-admin-accent hover:underline">
                          Edit
                        </summary>
                        <div className="mt-4 w-[min(36rem,80vw)] rounded-lg border border-admin-border bg-admin-surface/40 px-4 py-4">
                          <AdministratorForm administrator={row} self={self} />
                        </div>
                      </details>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pagination links={paginationLinks(administrators, "/admin/administrators")} />
    </div>
  );
}
