"use client";

import { useActionState } from "react";
import { AdminCheck, AdminInput, AdminTextarea, FormField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { ServiceCategory } from "@/lib/types";
import { deleteCategoryAction, saveCategoryAction } from "./actions";

/**
 * Create or edit one category.
 *
 * The same component for both, because the fields are the same and the only
 * difference is whether the form carries an id — which is also how the action
 * decides between a POST and a PUT. Two components would be two places to add
 * the next field to.
 */
export function CategoryForm({ category }: { category?: ServiceCategory }) {
  const [state, formAction] = useActionState(saveCategoryAction, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>{state.message}</FormMessage>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" error={state.errors?.name}>
          <AdminInput name="name" defaultValue={category?.name ?? ""} required maxLength={120} />
        </FormField>

        <FormField
          label="Slug"
          error={state.errors?.slug}
          hint="The public URL. Left blank, it is derived from the name."
        >
          <AdminInput name="slug" defaultValue={category?.slug ?? ""} maxLength={120} />
        </FormField>

        <FormField label="Icon" error={state.errors?.icon} hint="A short name the public grid maps to a glyph.">
          <AdminInput name="icon" defaultValue={category?.icon ?? ""} maxLength={32} />
        </FormField>

        <FormField label="Sort order" error={state.errors?.sort_order} hint="Lower numbers appear first.">
          <AdminInput
            type="number"
            name="sort_order"
            min={0}
            max={65535}
            defaultValue={category?.sort_order ?? 0}
          />
        </FormField>
      </div>

      <FormField label="Description" error={state.errors?.description}>
        <AdminTextarea
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={category?.description ?? ""}
        />
      </FormField>

      <AdminCheck
        name="is_active"
        label="Active"
        hint="Inactive categories are hidden from the public catalogue but keep their services."
        defaultChecked={category?.is_active ?? true}
      />

      {state.errors?.category ? (
        <FormMessage tone="error">{state.errors.category.join(" ")}</FormMessage>
      ) : null}

      <div>
        <SubmitButton size="sm" pendingLabel="Saving…">
          {category ? "Save changes" : "Create category"}
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Delete a category.
 *
 * Its own form because the two cannot nest, and its own confirmation because
 * the API refuses the delete outright once the category has services — so the
 * common outcome is a refusal the administrator needs to read, not a silent
 * removal.
 */
export function DeleteCategoryForm({ id, name }: { id: number; name: string }) {
  const [state, formAction] = useActionState(deleteCategoryAction, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>{state.message}</FormMessage>
      ) : null}

      <p className="text-xs text-admin-muted">
        Deleting removes the category from the catalogue for good. A category that still has services
        is refused — deactivate it instead.
      </p>

      <div>
        <SubmitButton size="sm" variant="danger" pendingLabel="Deleting…">
          Delete {name}
        </SubmitButton>
      </div>
    </form>
  );
}
