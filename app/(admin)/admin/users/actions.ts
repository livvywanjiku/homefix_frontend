"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { invalid, required, send, text } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * Account administration.
 *
 * The only write the console makes against a user record is a status change.
 * Both the decision and its limits live in Laravel: `refuseSelfTargeting` stops
 * an administrator locking themselves out, `refuseProtectedTargets` stops an
 * ordinary administrator touching another administrator, and a super
 * administrator cannot be suspended from the console at all. None of that is
 * re-implemented here — this action sends the intent and renders whatever the API
 * answers, including its refusals.
 */

export async function setUserStatusAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "suspend_users")) {
    return {
      status: "error",
      message: "Your account does not hold the suspend_users permission.",
    };
  }

  const id = required(formData, "id");
  const action = required(formData, "action");
  const reason = text(formData, "reason");

  if (!id) return invalid({ id: ["No account was identified."] });

  if (action !== "suspend" && action !== "activate") {
    return invalid({ action: ["Choose whether to suspend or reinstate this account."] });
  }

  if (action === "suspend" && !reason?.trim()) {
    return invalid({ reason: ["Give a reason — it is recorded in the audit log."] });
  }

  const failure = await send(session.token, "PUT", `/admin/users/${id}/status`, {
    action,
    // Omitted rather than sent empty on reinstatement: Laravel's `required_if`
    // only demands it for a suspension.
    ...(action === "suspend" ? { reason: reason?.trim() } : {}),
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);

  if (failure) return failure;

  return {
    status: "success",
    message:
      action === "suspend"
        ? "That account has been suspended and can no longer sign in."
        : "That account has been reinstated.",
  };
}
