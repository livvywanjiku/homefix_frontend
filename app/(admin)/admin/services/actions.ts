"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { checked, invalid, numeric, required, send, text } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * The services inside the catalogue.
 *
 * Separate from the category actions beside this file because the two have
 * genuinely different rules — a service belongs to a category, a category does
 * not — and one module that branched on both would be harder to read than two
 * that each do one thing.
 *
 * Deactivation is offered as the reversible alternative to deletion everywhere
 * the API refuses a delete, and the console never tries to guess which case it
 * is in: it sends the delete and renders whatever Laravel answers.
 */

/** The fields every service write carries. */
function serviceBody(formData: FormData): Record<string, unknown> {
  const slug = text(formData, "slug")?.trim();
  const description = text(formData, "description")?.trim();

  return {
    service_category_id: numeric(formData, "service_category_id"),
    name: required(formData, "name").trim(),
    // Omitted when blank so the API derives it from the name.
    ...(slug ? { slug } : {}),
    description: description ? description : null,
    is_active: checked(formData, "is_active"),
  };
}

export async function saveServiceAction(
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
  const body = serviceBody(formData);

  if (!body.name) return invalid({ name: ["Give the service a name."] });

  /*
   * Required on both paths. `UpdateServiceRequest` accepts the key, so moving a
   * service to another category is a legitimate edit — a form that showed the
   * picker and then quietly dropped its value would be the worst of both.
   */
  if (!body.service_category_id) {
    return invalid({ service_category_id: ["Choose the category this service belongs to."] });
  }

  const failure = id
    ? await send(session.token, "PUT", `/admin/services/${id}`, body)
    : await send(session.token, "POST", "/admin/services", body);

  revalidatePath("/admin/services");
  revalidatePath("/admin/categories");
  revalidatePath("/services");

  if (failure) return failure;

  return { status: "success", message: id ? "Service updated." : "Service added to the catalogue." };
}

export async function deleteServiceAction(
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

  if (!id) return invalid({ id: ["No service was identified."] });

  const failure = await send(session.token, "DELETE", `/admin/services/${id}`);

  revalidatePath("/admin/services");
  revalidatePath("/admin/categories");
  revalidatePath("/services");

  if (failure) return failure;

  return { status: "success", message: "Service deleted." };
}
