"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { send } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * Roles and their permissions (spec §20).
 *
 * The list is whatever the form submitted, passed on as it stands. That is
 * deliberate: `UpdateRolePermissionsRequest` validates every value against the
 * `Permission` enum and the controller refuses the four super-administrator-only
 * permissions outright, so a hand-rolled request that names a capability the
 * code does not check for is a 422 rather than a silent grant. Filtering here
 * would only create a second, weaker copy of those rules.
 *
 * An empty submission is legitimate — clearing a role's grants is how a role is
 * retired — which is why the field is read with `getAll` rather than required.
 */

export async function saveRolePermissionsAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_permissions")) {
    return {
      status: "error",
      message: "Your account does not hold the manage_permissions permission.",
    };
  }

  const id = formData.get("id");

  if (typeof id !== "string" || id === "") {
    return { status: "error", message: "No role was identified." };
  }

  const permissions = formData
    .getAll("permissions")
    .filter((value): value is string => typeof value === "string");

  const failure = await send(session.token, "PUT", `/admin/roles/${id}/permissions`, {
    permissions,
  });

  revalidatePath("/admin/roles");

  if (failure) return failure;

  return {
    status: "success",
    message:
      permissions.length === 0
        ? "Role saved with no permissions."
        : `Role saved with ${permissions.length} permission${permissions.length === 1 ? "" : "s"}.`,
  };
}
