"use client";

import { useActionState } from "react";
import { Pill, statusPillTone } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { transitionBookingAction } from "../actions";

/**
 * Move a booking to another state.
 *
 * The options are the ones the API sent for *this* booking, not the whole enum:
 * a booking that is in progress cannot be cancelled, and offering the button
 * anyway would teach an administrator that the screen lies. The wording above
 * the form says the move is subject to the same state machine as everybody
 * else's, because that is the point of having one.
 */
export function TransitionBookingForm({
  id,
  status,
  statusLabel,
  allowed,
}: {
  id: number;
  /** The raw state, for the pill's tone. */
  status: string;
  /** The API's own wording, for the sentence. */
  statusLabel: string;
  allowed: { value: string; label: string }[];
}) {
  const [state, formAction] = useActionState(transitionBookingAction, INITIAL_FORM_STATE);

  if (allowed.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          This booking is <Pill tone={statusPillTone(status)}>{statusLabel}</Pill>
        </p>
        <p className="rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-3 text-sm text-admin-muted">
          Nothing follows this state. A booking that was cancelled wrongly is a commercial
          conversation, not a status edit — the record stands as the history of what happened.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="booking_id" value={id} />

      <p className="text-sm">
        This booking is <Pill tone={statusPillTone(status)}>{statusLabel}</Pill>
      </p>

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
        Move to
        <select
          name="status"
          required
          defaultValue=""
          className="rounded-md border border-admin-border bg-admin-card px-2.5 py-2 text-sm text-admin-text focus:border-admin-accent focus:outline-none"
        >
          <option key="choose-a-state" value="" disabled>
            Choose a state
          </option>
          {allowed.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {state.errors?.status ? (
          <span className="text-danger">{state.errors.status.join(" ")}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
        Note (recorded in the history)
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          placeholder="Dispute resolved in the customer's favour; the cracked tile was re-laid."
          className="rounded-md border border-admin-border bg-admin-card px-2.5 py-2 text-sm text-admin-text placeholder:text-admin-muted focus:border-admin-accent focus:outline-none"
        />
        <span className="font-normal">
          Appears on the booking&apos;s timeline, attributed to you. Left blank, the move is recorded
          as an administrative change.
        </span>
      </label>

      <div>
        <SubmitButton pendingLabel="Moving…">Move this booking</SubmitButton>
      </div>
    </form>
  );
}
