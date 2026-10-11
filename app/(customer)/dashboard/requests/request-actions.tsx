"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Field, FileInput, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { ServiceRequestImage } from "@/lib/types";
import {
  cancelRequestAction,
  deleteRequestImageAction,
  uploadRequestImagesAction,
} from "./actions";

/**
 * Withdraws a job.
 *
 * The reason is optional and shared with the professionals who quoted, which is
 * the courtesy the API describes — so it is asked for, but not demanded.
 */
export function CancelRequestForm({ id }: { id: number }) {
  const [state, formAction] = useActionState(cancelRequestAction, INITIAL_FORM_STATE);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      <Field
        name="reason"
        label="Why are you cancelling?"
        errors={state.errors?.reason}
        hint="Optional, and shown to anyone who quoted."
      >
        {(props) => (
          <Textarea {...props} rows={3} maxLength={500} placeholder="Found someone locally." />
        )}
      </Field>

      <div>
        <SubmitButton variant="danger" pendingLabel="Cancelling…">
          Cancel this request
        </SubmitButton>
      </div>
    </form>
  );
}

/** Adds more photos to an open request, up to the API's own ceiling. */
export function AddPhotosForm({ id }: { id: number }) {
  const [state, formAction] = useActionState(uploadRequestImagesAction, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      <Field
        name="images"
        label="Add more photos"
        errors={state.errors?.images}
        hint="Up to 5 at a time, 4 MB each."
      >
        {(props) => (
          <FileInput {...props} multiple accept="image/jpeg,image/png,image/webp" />
        )}
      </Field>

      <div>
        <SubmitButton variant="secondary" size="sm" pendingLabel="Uploading…">
          Upload
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Removes one photo.
 *
 * A plain form rather than anything interactive: the row disappears on submit,
 * and there is nothing to report back if it fails beyond the page re-rendering.
 */
export function DeleteImageButton({
  requestId,
  image,
}: {
  requestId: number;
  image: ServiceRequestImage;
}) {
  return (
    <form action={deleteRequestImageAction}>
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="image_id" value={image.id} />

      <button
        type="submit"
        className="rounded-lg border border-line bg-card/90 px-2 py-1 text-xs font-medium text-danger hover:bg-danger-50"
      >
        Remove
      </button>
    </form>
  );
}
