"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { required, send, text } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * The administrator roster (spec §20).
 *
 * Two rules from Laravel are mirrored here rather than invented: the role list
 * is the two administrative roles, and nobody changes their own role. Both are
 * enforced again in `UpdateAdministratorRequest` and in the controller — the
 * checks here exist so the form can explain itself, not to be the gate.
 *
 * The password is required on create and optional on update, because
 * `UpdateAdministratorRequest` accepts it as `sometimes`: a name correction must
 * not silently reset an account's credentials.
 */

const ADMINISTRATIVE_ROLES = ["admin", "superadmin"] as const;

function isAdministrativeRole(value: string): boolean {
  return (ADMINISTRATIVE_ROLES as readonly string[]).includes(value);
}

export async function saveAdministratorAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_administrators")) {
    return {
      status: "error",
      message: "Your account does not hold the manage_administrators permission.",
    };
  }

  const id = text(formData, "id");
  const creating = id === undefined;

  const name = required(formData, "name").trim();
  const email = required(formData, "email").trim();
  const phone = text(formData, "phone")?.trim() ?? "";
  const role = required(formData, "role");
  const password = text(formData, "password") ?? "";
  const confirmation = text(formData, "password_confirmation") ?? "";

  const errors: Record<string, string[]> = {};

  if (!name) errors.name = ["Give the administrator a name."];
  if (!email) errors.email = ["An email address is required."];

  /*
   * On create the role is compulsory. On update it is only present when the
   * form could offer it: the password field's sibling, the role picker, is
   * disabled on the signed-in administrator's own row, and a disabled control
   * submits nothing — which is exactly the shape the controller wants, since it
   * refuses a self-role-change outright.
   */
  if (creating) {
    if (!isAdministrativeRole(role)) errors.role = ["Choose one of the administrative roles."];
  } else if (role !== "" && !isAdministrativeRole(role)) {
    errors.role = ["Choose one of the administrative roles."];
  }

  if (creating && !password) {
    errors.password = ["Set a password for the new account."];
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Check the highlighted fields and try again.", errors };
  }

  const body: Record<string, unknown> = {
    name,
    email,
    phone: phone === "" ? null : phone,
    ...(role === "" ? {} : { role }),
    // Omitted entirely when blank so the API leaves the existing hash alone.
    ...(password === "" ? {} : { password, password_confirmation: confirmation }),
  };

  const failure = id
    ? await send(session.token, "PUT", `/admin/administrators/${id}`, body)
    : await send(session.token, "POST", "/admin/administrators", body);

  revalidatePath("/admin/administrators");

  if (failure) return failure;

  return { status: "success", message: id ? "Administrator updated." : "Administrator added." };
}
