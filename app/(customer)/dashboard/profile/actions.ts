"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiFetch } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";
import { fieldErrors } from "@/lib/validation/errors";
import { accountSchema } from "@/lib/validation/account";

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function required(formData: FormData, key: string): string {
  return text(formData, key) ?? "";
}

function messageFrom(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  return "That did not work. Please try again.";
}

/**
 * Saves the customer's own name and phone.
 *
 * The number matters beyond the profile: it is the one a professional is given
 * after an award, so this page is where a customer keeps it current. The
 * endpoint resolves the account from the token and refuses to change anything
 * but the caller's own row.
 */
export async function saveAccountAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("customer");

  const parsed = accountSchema.safeParse({
    name: required(formData, "name"),
    phone: required(formData, "phone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    await apiFetch("/auth/profile", {
      method: "PUT",
      token: session.token,
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      const errors = error.validationErrors();

      return {
        status: "error",
        message:
          Object.keys(errors).length > 0
            ? "Check the highlighted fields and try again."
            : messageFrom(error.body),
        errors,
      };
    }

    return {
      status: "error",
      message: "Cannot reach the HomeFix service right now. Please try again shortly.",
    };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");

  return { status: "success", message: "Your details have been saved." };
}
