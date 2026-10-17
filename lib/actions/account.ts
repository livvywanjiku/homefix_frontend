"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiFetch } from "@/lib/api";
import { requireSession } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";

/*
 * Avatar changes, shared by both workspaces.
 *
 * The Laravel endpoint resolves the account from the token, so there is no id
 * here that could point at somebody else's photo. `requireSession` rather than
 * `requireRole` is deliberate: customers and professionals both have a profile.
 */

function failureFrom(error: unknown): FormState {
  if (error instanceof ApiError) {
    const errors = error.validationErrors();

    return {
      status: "error",
      message:
        Object.keys(errors).length > 0
          ? "Check the highlighted fields and try again."
          : "That photo could not be uploaded. Please try again.",
      errors,
    };
  }

  return {
    status: "error",
    message: "Cannot reach the HomeFix service right now. Please try again shortly.",
  };
}

/**
 * Refreshes every surface an avatar can appear on.
 *
 * The public profile patterns are included because a professional's photo is
 * also shown in discovery; without them a newly uploaded picture would be
 * missing from the very pages customers browse.
 */
function refresh(): void {
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  revalidatePath("/pro/profile");
  revalidatePath("/pro");
  revalidatePath("/professionals");
  revalidatePath("/professionals/[id]", "page");
}

export async function uploadAvatarAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const photo = formData.get("avatar");

  if (!(photo instanceof File) || photo.size === 0) {
    return {
      status: "error",
      message: "Choose a photo to upload.",
      errors: { avatar: ["Choose a photo"] },
    };
  }

  // Rebuilt rather than forwarded: the endpoint takes one file under `avatar`.
  const body = new FormData();
  body.append("avatar", photo);

  try {
    await apiFetch("/auth/avatar", {
      method: "POST",
      token: session.token,
      body,
    });
  } catch (error) {
    return failureFrom(error);
  }

  refresh();

  return { status: "success", message: "Your photo has been updated." };
}

/**
 * Removes the photo and falls back to initials.
 *
 * Takes only `FormData` because there is nothing to report back — the picture
 * disappears, and a failure is better represented by the page than by a form
 * that no longer exists.
 */
export async function removeAvatarAction(): Promise<void> {
  const session = await requireSession();

  try {
    await apiFetch("/auth/avatar", { method: "DELETE", token: session.token });
  } catch {
    return;
  }

  refresh();
}
