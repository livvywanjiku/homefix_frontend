import type { Metadata } from "next";
import { NoAccess, PageIntro, Panel, Pill } from "@/components/admin/ui";
import { can, type AdminPermissionOption, type AdminRoleRow } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { RoleEditor } from "./role-editor";

export const metadata: Metadata = { title: "Roles & Permissions" };

/*
 * Roles and permissions (spec §20).
 *
 * What a role may hold is decided by Laravel, not here: the four permissions
 * governing administrators, roles, permissions and settings are reserved to the
 * super administrator and are refused outright if a form submits them. They are
 * shown disabled so the rule is visible rather than discovered through a 422.
 *
 * Every role is listed, including the ones customers and professionals hold.
 * They are roles in the same table with the same mechanics, and hiding them
 * would make this screen a partial view of a system that is not partial.
 *
 * There is no "create a role" form because the permission vocabulary is a PHP
 * enum compiled into the middleware. A role invented here would hold grants that
 * no route checks for, which is a checkbox that does nothing dressed up as a
 * feature.
 */
export default async function AdminRolesPage() {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_permissions")) {
    return <NoAccess permission="manage_permissions" />;
  }

  const { roles, permissions } = await apiFetch<{
    roles: AdminRoleRow[];
    permissions: AdminPermissionOption[];
  }>("/admin/roles", { token: session.token });

  const reserved = permissions.filter((permission) => permission.reserved).length;

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {roles.length} role{roles.length === 1 ? "" : "s"} over {permissions.length}{" "}
            permissions. The permission names are the ones the API's route middleware checks, so a
            box ticked here is a gate that opens — and a capability the code does not check for does
            not appear at all. {reserved} permissions are reserved to the super administrator.
          </>
        }
      />

      {roles.map((role) => (
        <Panel
          key={role.id}
          title={
            <span className="flex flex-wrap items-center gap-2">
              {role.label}
              <span className="font-mono text-xs font-normal text-admin-muted">{role.name}</span>
              {role.is_customised ? <Pill tone="accent">Edited by hand</Pill> : null}
            </span>
          }
          description={`${role.users_count} account${role.users_count === 1 ? "" : "s"} · ${role.permissions_count} of ${permissions.length} permissions`}
        >
          <RoleEditor role={role} permissions={permissions} />
        </Panel>
      ))}
    </div>
  );
}
