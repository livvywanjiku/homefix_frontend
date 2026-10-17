"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { acceptQuotationAction, rejectQuotationAction } from "./actions";

type Props = {
  requestId: number;
  quotationId: number;
  reference: string;
  professional: string;
};

/**
 * Awards the job to one quote.
 *
 * The confirmation is deliberate. Accepting is final and declines every other
 * offer on the job in the same breath, so a stray click would cost the customer
 * the whole comparison — not just one row.
 */
export function AcceptQuoteButton({ requestId, quotationId, reference, professional }: Props) {
  const [state, action] = useActionState(acceptQuotationAction, INITIAL_FORM_STATE);

  return (
    <form
      action={action}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Award this job to ${professional}? This accepts quote ${reference} and declines every other quote. It cannot be undone.`,
        );

        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="quotation_id" value={quotationId} />

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      <div>
        <SubmitButton pendingLabel="Awarding…">Accept this quote</SubmitButton>
      </div>
    </form>
  );
}

/**
 * Turns one quote down without closing the job.
 *
 * Also confirmed, because a rejected quote cannot be accepted later — the
 * customer would have to ask the professional to quote again, which the API
 * does not allow on the same job.
 */
export function RejectQuoteButton({ requestId, quotationId, professional }: Props) {
  const [state, action] = useActionState(rejectQuotationAction, INITIAL_FORM_STATE);

  return (
    <form
      action={action}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Decline ${professional}'s quote? They cannot send another one on this job.`,
        );

        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="quotation_id" value={quotationId} />

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      {state.status === "success" && state.message ? (
        <FormMessage tone="success">{state.message}</FormMessage>
      ) : null}

      <div>
        <SubmitButton variant="danger" pendingLabel="Declining…">
          Decline
        </SubmitButton>
      </div>
    </form>
  );
}
