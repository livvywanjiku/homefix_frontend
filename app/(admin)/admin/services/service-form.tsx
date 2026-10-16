"use client";

import { useActionState } from "react";
import { AdminCheck, AdminInput, AdminSelect, AdminTextarea, FormField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { Service, ServiceCategory } from "@/lib/types";
import { deleteServiceAction, saveServiceAction } from "./actions";

/**
 * Add or edit one catalogue service.
 *
 * One component for both, as with categories: the fields are the same and the
 * presence of an id is what makes the action PUT rather than POST. The category
 * picker is populated from the full category list, including inactive ones — a
 * service belonging to a switched-off category is a real state the console has
 * to be able to represent rather than one it silently prevents.
 */
export function ServiceForm({
  service,
  categories,
  defaultCategoryId,
}: {
  service?: Service;
  categories: ServiceCategory[];
  defaultCategoryId?: string;
}) {
  const [state, formAction] = useActionState(saveServiceAction, INITIAL_FORM_STATE);

  const selected = service?.service_category_id ?? defaultCategoryId ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>{state.message}</FormMessage>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" error={state.errors?.name}>
          <AdminInput name="name" defaultValue={service?.name ?? ""} required maxLength={120} />
        </FormField>

        <FormField label="Category" error={state.errors?.service_category_id}>
          <AdminSelect name="service_category_id" defaultValue={String(selected)} required>
            <option key="choose-a-category" value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
                {category.is_active ? "" : " (hidden)"}
              </option>
            ))}
          </AdminSelect>
        </FormField>

        <FormField
          label="Slug"
          error={state.errors?.slug}
          hint="The public URL. Left blank, it is derived from the name."
        >
          <AdminInput name="slug" defaultValue={service?.slug ?? ""} maxLength={120} />
        </FormField>
      </div>

      <FormField label="Description" error={state.errors?.description}>
        <AdminTextarea
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={service?.description ?? ""}
        />
      </FormField>

      <AdminCheck
        name="is_active"
        label="Active"
        hint="Inactive services stay on the books for professionals already offering them, but leave the public grid."
        defaultChecked={service?.is_active ?? true}
      />

      {state.errors?.service ? (
        <FormMessage tone="error">{state.errors.service.join(" ")}</FormMessage>
      ) : null}

      <div>
        <SubmitButton size="sm" pendingLabel="Saving…">
          {service ? "Save changes" : "Add service"}
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Delete a service.
 *
 * Refused once professionals have priced against it, which is the usual outcome
 * for anything that has been live for a while — the message says so and names
 * deactivation as the alternative, so the button is not a dead end.
 */
export function DeleteServiceForm({ id, name }: { id: number; name: string }) {
  const [state, formAction] = useActionState(deleteServiceAction, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>{state.message}</FormMessage>
      ) : null}

      <p className="text-xs text-admin-muted">
        A service any professional has priced against cannot be deleted — deactivate it instead, which
        keeps their offering and the customers&apos; history intact.
      </p>

      <div>
        <SubmitButton size="sm" variant="danger" pendingLabel="Deleting…">
          Delete {name}
        </SubmitButton>
      </div>
    </form>
  );
}
