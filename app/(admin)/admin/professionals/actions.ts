"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { invalid, required, send, text } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * The directory's two writes.
 *
 * They are separate because they answer different questions. Suspending a
 * *listing* hides it from customers and stops it being booked; the person can
 * still sign in and sort out whatever went wrong. Suspending the *account*
 * behind it stops them signing in at all, which is the heavier and rarer of the
 * two. Collapsing them into one button would take that choice away from the
 * administrator, and collapsing them into one permission would mean the
 * catalogue and the account system could not be run by different people.
 *
 * Neither action re-implements a rule. Laravel decides whether the transition
 * is legal and whether the target may be touched, and its refusal is rendered
 * verbatim — that is why `send` hands the API's own message back.
 */

export async function setProfessionalStatusAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_professionals")) {
    return {
      status: "error",
      message: "Your account does not hold the manage_professionals permission.",
    };
  }

  const id = required(formData, "id");
  const action = required(formData, "action");
  const reason = text(formData, "reason");

  if (!id) return invalid({ id: ["No professional was identified."] });

  if (action !== "suspend" && action !== "reinstate") {
    return invalid({ action: ["Choose whether to suspend or reinstate this listing."] });
  }

  if (action === "suspend" && !reason?.trim()) {
    return invalid({ reason: ["Give a reason — it is shown to the professional and audited."] });
  }

  const failure = await send(session.token, "PUT", `/admin/professionals/${id}/status`, {
    action,
    // Omitted rather than sent empty on reinstatement: `required_if` only
    // demands a reason for a suspension.
    ...(action === "suspend" ? { reason: reason?.trim() } : {}),
  });

  revalidatePath("/admin/professionals");
  revalidatePath(`/admin/professionals/${id}`);

  if (failure) return failure;

  return {
    status: "success",
    message:
      action === "suspend"
        ? "That listing is suspended and no longer visible to customers."
        : "That listing has been reinstated as verified.",
  };
}

export async function suspendProfessionalAccountAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  /*
   * The account behind the profile is a user account, and the API route that
   * suspends it is gated on `manage_professionals` — but the effect is a
   * sign-in being revoked, so the console also insists on `suspend_users`. An
   * administrator trusted to curate the directory is not automatically trusted
   * to lock people out; if the platform wants the two to be the same person, it
   * grants both.
   */
  if (!can(account.permissions, "manage_professionals") || !can(account.permissions, "suspend_users")) {
    return {
      status: "error",
      message:
        "Suspending the account behind a listing requires both manage_professionals and suspend_users.",
    };
  }

  const id = required(formData, "id");

  if (!id) return invalid({ id: ["No professional was identified."] });

  const failure = await send(session.token, "POST", `/admin/professionals/${id}/suspend-account`);

  revalidatePath("/admin/professionals");
  revalidatePath(`/admin/professionals/${id}`);

  if (failure) return failure;

  return {
    status: "success",
    message: "That account has been suspended and can no longer sign in.",
  };
}
