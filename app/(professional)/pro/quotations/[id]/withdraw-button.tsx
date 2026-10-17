"use client";

import { SubmitButton } from "@/components/ui/button";
import { withdrawQuotationAction } from "../../actions";

/**
 * Withdrawing is final — the API will not let the same professional quote on the
 * job again — so it asks first. The form posts to the server action, which
 * revalidates the list and this page on its way out.
 */
export function WithdrawQuoteButton({ id }: { id: number }) {
  return (
    <form
      action={withdrawQuotationAction}
      onSubmit={(event) => {
        if (!window.confirm("Withdraw this quote? You cannot send another one on this job.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />

      <SubmitButton variant="danger" pendingLabel="Withdrawing…">
        Withdraw quote
      </SubmitButton>
    </form>
  );
}
