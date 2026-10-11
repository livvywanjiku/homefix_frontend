"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { invalid, required, send, text } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * Verification decisions.
 *
 * Both routes behind these actions already require `verify_professional`, and
 * the model policies independently confirm the reviewer is acting as an
 * administrator. The checks here are the console's own: they stop a form that
 * was somehow submitted by an account without the grant before a request is
 * made, and they turn a missing reason into a field error rather than a round
 * trip. They are not the gate — Laravel is.
 *
 * The decision vocabulary is the API's: `verify|reject|suspend` for an
 * application, `approve|reject` for a single document. Both are re-stated here
 * so a form posting something else fails loudly in the console rather than
 * arriving at Laravel as a validation error about a field the user never saw.
 */

const PROFESSIONAL_DECISIONS = ["verify", "reject", "suspend"] as const;

export async function reviewProfessionalAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "verify_professional")) {
    return {
      status: "error",
      message: "Your account does not hold the verify_professional permission.",
    };
  }

  const id = required(formData, "professional_id");
  const decision = required(formData, "decision");
  const notes = text(formData, "notes");

  if (!id) return invalid({ decision: ["No application was identified."] });

  if (!(PROFESSIONAL_DECISIONS as readonly string[]).includes(decision)) {
    return invalid({ decision: ["Choose whether to verify, reject or suspend."] });
  }

  // Required for the adverse decisions, exactly as the API's `required_if` has
  // it. Checking here means the professional is never rejected without a reason
  // because a browser skipped the `required` attribute.
  if (decision !== "verify" && !notes?.trim()) {
    return invalid({ notes: ["Tell the professional why, so they can put it right."] });
  }

  const failure = await send(session.token, "POST", `/admin/professionals/${id}/review`, {
    decision,
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  });

  revalidatePath("/admin/verification");
  revalidatePath("/admin/professionals");
  revalidatePath(`/admin/professionals/${id}`);

  if (failure) return failure;

  const recorded: Record<string, string> = {
    verify: "Verified. The profile is now listed and bookable.",
    reject: "Rejected. The professional can correct the application and resubmit.",
    suspend: "Suspended. The listing is no longer visible to customers.",
  };

  return {
    status: "success",
    message: recorded[decision],
  };
}

export async function reviewDocumentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "verify_professional")) {
    return {
      status: "error",
      message: "Your account does not hold the verify_professional permission.",
    };
  }

  const documentId = required(formData, "document_id");
  // Carried through the form purely so the professional's page can be
  // revalidated after the document it belongs to changes.
  const professionalId = text(formData, "professional_id");
  const decision = required(formData, "decision");
  const notes = text(formData, "notes");

  if (!documentId) return invalid({ decision: ["No document was identified."] });

  if (decision !== "approve" && decision !== "reject") {
    return invalid({ decision: ["Choose whether to approve or reject the document."] });
  }

  if (decision === "reject" && !notes?.trim()) {
    return invalid({ notes: ["Say why the document was rejected so it can be replaced."] });
  }

  const failure = await send(session.token, "POST", `/admin/documents/${documentId}/review`, {
    decision,
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  });

  revalidatePath("/admin/verification");
  revalidatePath("/admin/professionals");
  if (professionalId) revalidatePath(`/admin/professionals/${professionalId}`);

  if (failure) return failure;

  return {
    status: "success",
    message: decision === "approve" ? "Document approved." : "Document rejected.",
  };
}
