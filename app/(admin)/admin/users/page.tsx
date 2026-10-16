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
  statusPillTone,
} from "@/components/admin/ui";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { ACCOUNT_STATUS_OPTIONS, ROLE_OPTIONS, USER_SORT_OPTIONS, can, type AdminUserRow } from "@/lib/admin";
import { currentAdmin, filters, one } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatDate, formatRelative } from "@/lib/format";
import { paginationLinks } from "@/lib/pagination";
import type { Paginated } from "@/lib/types";

export const metadata: Metadata = { title: "Users" };

/**
 * Every account on the platform.
 *
 * The filters are a `GET` form, so a filtered view is a URL an administrator can
 * send to a colleague; the search box is the same control the header's global
 * search posts into, which is why the two land on the same page.
 *
 * The list itself is Laravel's — filtered, sorted and paginated there — rather
 * than fetched whole and narrowed in the browser. On a platform with a hundred
 * thousand customers the latter is not a slow page, it is a failed one.
 */
export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "view_users")) {
    return <NoAccess permission="view_users" />;
  }

  const params = await props.searchParams;
  const search = filters(params, ["role", "status", "q", "sort", "per_page"]);
  const page = one(params.page);
  if (page) search.page = page;

  const users = await apiFetch<Paginated<AdminUserRow>>("/admin/users", {
    token: session.token,
    search,
  });

  const filtered = Object.keys(search).some((key) => key !== "page" && key !== "per_page");

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {users.meta.total.toLocaleString()} account{users.meta.total === 1 ? "" : "s"} match.
            Suspending an account is recorded in the audit log and takes effect on the account's next
            request.
          </>
        }
      />

      <FilterBar action="/admin/users">
        <FilterField label="Search" className="min-w-[14rem] flex-1">
          <AdminInput
            type="search"
            name="q"
            defaultValue={one(params.q) ?? ""}
            placeholder="Name, email or phone"
          />
        </FilterField>

        <FilterField label="Role">
          <AdminSelect name="role" defaultValue={one(params.role) ?? ""}>
            <option key="any-role" value="">Any role</option>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Status">
          <AdminSelect name="status" defaultValue={one(params.status) ?? ""}>
            <option key="any-status" value="">Any status</option>
            {ACCOUNT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterField label="Order">
          <AdminSelect name="sort" defaultValue={one(params.sort) ?? "recent"}>
            {USER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </FilterField>

        <FilterSubmit>Apply</FilterSubmit>

        {filtered ? (
          <Link
            href="/admin/users"
            className="pb-2 text-xs font-medium text-admin-muted hover:text-admin-text"
          >
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Panel title="Accounts" bodyClassName="">
        {users.data.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyPanel
              label={
                filtered
                  ? "No account matches those filters."
                  : "No accounts have registered yet."
              }
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Account</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH className="hidden lg:table-cell">Verified</TH>
                <TH className="hidden lg:table-cell">Joined</TH>
              </TR>
            </THead>
            <TBody>
              {users.data.map((user) => (
                <TR key={user.id}>
                  <TD>
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-medium hover:text-admin-accent"
                    >
                      {user.name}
                    </Link>
                    <p className="text-xs text-admin-muted">{user.email}</p>
                  </TD>
                  <TD className="text-xs">
                    {user.role ? (
                      ROLE_OPTIONS.find((option) => option.value === user.role)?.label ?? user.role
                    ) : (
                      <span className="text-admin-muted">No role</span>
                    )}
                  </TD>
                  <TD>
                    <Pill tone={statusPillTone(user.status)}>{user.status}</Pill>
                  </TD>
                  <TD className="hidden text-xs text-admin-muted lg:table-cell">
                    {user.email_verified_at ? "Verified" : "Not verified"}
                  </TD>
                  <TD className="hidden text-xs text-admin-muted lg:table-cell">
                    {formatDate(user.created_at)}
                    <span className="block">{formatRelative(user.created_at)}</span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pagination links={paginationLinks(users, "/admin/users")} />
    </div>
  );
}
