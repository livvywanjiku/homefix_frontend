"use client";

import { useActionState } from "react";
import { Pill } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { setUserStatusAction } from "../actions";

/**
 * Suspend or reinstate an account.
 *
 * The reason is required only for a suspension, which is why the field is always
 * on screen rather than swapped in and out: a control that appears when you pick
 * the other option is one you have already submitted past. The button's wording
 * follows the account's current status, so the destructive option is never the
 * one that looks like the safe default.
 */
export function UserStatusForm({
  id,
  status,
}: {
  id: number;
  status: "active" | "suspended" | string;
}) {
  const [state, formAction] = useActionState(setUserStatusAction, INITIAL_FORM_STATE);

  const suspending = status === "active";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={suspending ? "suspend" : "activate"} />

      <p className="text-sm">
        This account is currently{" "}
        <Pill tone={suspending ? "success" : "danger"}>{status}</Pill>
      </p>

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      {state.errors?.action ? (
        <FormMessage tone="error">{state.errors.action.join(" ")}</FormMessage>
      ) : null}

      <label className="flex flex-col gap-1 text-xs font-medium text-admin-muted">
        {suspending ? "Reason for suspending" : "Reason (recorded, optional)"}
        <textarea
          name="reason"
          rows={3}
          maxLength={500}
          required={suspending}
          placeholder={
            suspending ? "Repeated no-shows reported by three customers." : "Appeal upheld."
          }
          className="rounded-md border border-admin-border bg-admin-card px-2.5 py-2 text-sm text-admin-text placeholder:text-admin-muted focus:border-admin-accent focus:outline-none"
        />
        {state.errors?.reason ? (
          <span className="text-danger">{state.errors.reason.join(" ")}</span>
        ) : (
          <span className="font-normal">Written to the audit log with your name against it.</span>
        )}
      </label>

      <div>
        <SubmitButton
          variant={suspending ? "danger" : "primary"}
          pendingLabel={suspending ? "Suspending…" : "Reinstating…"}
        >
          {suspending ? "Suspend this account" : "Reinstate this account"}
        </SubmitButton>
      </div>
    </form>
  );
}
