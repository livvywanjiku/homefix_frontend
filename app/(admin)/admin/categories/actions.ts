"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { checked, invalid, numeric, required, send, text } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * Service categories.
 *
 * One save action branching on whether the form carried an id, rather than
 * separate create and update actions: the same component serves both, and the
 * distinction that matters is a property of the request rather than of the
 * screen.
 *
 * The slug is left to Laravel when the field is empty — `prepareForValidation`
 * derives it from the name, and that rule should live in one place rather than
 * being re-implemented here where the two could drift.
 *
 * The delete is its own action because it can be refused for a reason worth
 * reading: a category that still has services is not removable, and the API's
 * message names the reversible alternative. Passing that through verbatim is
 * the whole point of `send`.
 */

/** The fields every category write carries. */
function categoryBody(formData: FormData): Record<string, unknown> {
  const trimmed = (key: string): string | null => {
    const value = text(formData, key)?.trim();

    return value ? value : null;
  };

  return {
    name: required(formData, "name").trim(),
    slug: trimmed("slug"),
    description: trimmed("description"),
    icon: trimmed("icon"),
    sort_order: numeric(formData, "sort_order"),
    is_active: checked(formData, "is_active"),
  };
}

export async function saveCategoryAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_service_catalogue")) {
    return {
      status: "error",
      message: "Your account does not hold the manage_service_catalogue permission.",
    };
  }

  const id = text(formData, "id");
  const body = categoryBody(formData);

  if (!body.name) return invalid({ name: ["Give the category a name."] });

  // Omitted when blank so the API's own slug derivation runs instead of an
  // empty string failing the pattern rule.
  if (body.slug === null) delete body.slug;

  const failure = id
    ? await send(session.token, "PUT", `/admin/categories/${id}`, body)
    : await send(session.token, "POST", "/admin/categories", body);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/services");
  // The public grid reads the same catalogue and caches its own copy.
  revalidatePath("/services");

  if (failure) return failure;

  return { status: "success", message: id ? "Category updated." : "Category created." };
}

export async function deleteCategoryAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_service_catalogue")) {
    return {
      status: "error",
      message: "Your account does not hold the manage_service_catalogue permission.",
    };
  }

  const id = required(formData, "id");

  if (!id) return invalid({ id: ["No category was identified."] });

  const failure = await send(session.token, "DELETE", `/admin/categories/${id}`);

  revalidatePath("/admin/categories");
  revalidatePath("/admin/services");
  revalidatePath("/services");

  if (failure) return failure;

  return { status: "success", message: "Category deleted." };
}
