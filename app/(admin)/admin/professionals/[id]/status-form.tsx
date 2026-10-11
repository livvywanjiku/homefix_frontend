"use client";

import { useActionState } from "react";
import { Pill } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { setProfessionalStatusAction, suspendProfessionalAccountAction } from "../actions";

/**
 * The two suspensions, kept visibly separate.
 *
 * An administrator looking at a professional who has done something wrong has
 * two different questions to answer — "should their listing come down?" and
 * "should they be able to sign in?" — and the second is much heavier than the
 * first. Two panels, two sets of wording, so the wrong one is not picked by
 * accident.
 */

/** Suspend or reinstate the listing. */
export function ListingStatusForm({ id, status }: { id: number; status: string }) {
  const [state, formAction] = useActionState(setProfessionalStatusAction, INITIAL_FORM_STATE);

  // Only `verified` is a listing customers can see, so everything else is put
  // back by reinstating rather than suspended again.
  const suspending = status === "verified";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={suspending ? "suspend" : "reinstate"} />

      <p className="text-sm">
        This listing is <Pill tone={suspending ? "success" : "danger"}>{status}</Pill>
      </p>

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      {state.errors?.action ? (
        <FormMessage tone="error">{state.errors.action.join(" ")}</FormMessage>
      ) : null}

      {suspending ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
          Reason for suspending (required)
          <textarea
            name="reason"
            rows={3}
            maxLength={1000}
            required
            placeholder="Three customer complaints about unfinished work."
            className="rounded-md border border-admin-border bg-admin-card px-2.5 py-2 text-sm text-admin-text placeholder:text-admin-muted focus:border-admin-accent focus:outline-none"
          />
          {state.errors?.reason ? (
            <span className="text-danger">{state.errors.reason.join(" ")}</span>
          ) : (
            <span className="font-normal">
              Stored on the profile and written to the audit log with your name against it.
            </span>
          )}
        </label>
      ) : (
        <p className="text-sm text-admin-muted">
          Reinstating sets the listing back to verified and clears the suspension reason. Documents
          already approved stay approved.
        </p>
      )}

      <div>
        <SubmitButton
          variant={suspending ? "danger" : "primary"}
          pendingLabel={suspending ? "Suspending…" : "Reinstating…"}
        >
          {suspending ? "Suspend this listing" : "Reinstate this listing"}
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Suspend the account behind the profile.
 *
 * No reason field: the API records a fixed one for this action, because the
 * removal is from the directory and the account's own history carries the
 * detail. The confirmation is in the wording rather than a dialog — the button
 * says exactly what stops working.
 *
 * The form does not know whether the account is already suspended: the profile
 * resource deliberately does not publish the account's status, and inferring it
 * from the listing would be wrong — the two are independent. Reinstating
 * therefore points at the screen that does know.
 */
export function SuspendAccountForm({ id }: { id: number }) {
  const [state, formAction] = useActionState(suspendProfessionalAccountAction, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      <p className="text-sm text-admin-muted">
        The professional will no longer be able to sign in. Their profile, history and completed jobs
        are kept — this is a suspension, not a deletion. Reinstating is done from{" "}
        <span className="font-medium text-admin-text">Users</span>, where the reason is recorded.
      </p>

      <div>
        <SubmitButton variant="danger" pendingLabel="Suspending…">
          Suspend the account behind this profile
        </SubmitButton>
      </div>
    </form>
  );
}
