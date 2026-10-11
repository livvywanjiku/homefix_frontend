import type { Metadata } from "next";
import { NotBuiltYet } from "@/components/admin/not-yet";

export const metadata: Metadata = { title: "Payments" };

/*
 * Payments (spec §20).
 *
 * There is no `payments` table yet: the payment slice of the marketplace —
 * gateway, M-Pesa callback, settlement — has not been built, so there is
 * genuinely no payment row anywhere to list. A table of zeroes here would read
 * as "nobody has paid", which is a very different claim from "nothing can be
 * paid yet".
 */
export default function AdminPaymentsPage() {
  return (
    <NotBuiltYet
      title="Payments"
      permission="view_payments"
      summary="Monitoring for customer payments: what was charged, through which method, and whether it settled. A payment is marked paid only by a verified gateway callback, never by a request from the browser — so this screen reads the ledger, it never writes to it."
      willShow={[
        "Every payment with its booking, customer, professional, method and status.",
        "Amounts held in minor units and rendered in KES, totalled in the database rather than in the browser.",
        "M-Pesa receipts, gateway references and the raw callback payload for a disputed transaction.",
        "Filters by status, method and date range, and the transactions behind each payment.",
        "Refunds as a status change with a reason, attributed to the administrator who made it.",
      ]}
      meanwhile={
        <>
          The amount a job was agreed at is recorded on the booking itself —{" "}
          <span className="font-medium text-admin-text">Bookings</span> shows the labour, materials,
          transport and other components of every booking&rsquo;s total. What that total has no
          counterpart for yet is whether any of it was actually paid.
        </>
      }
    />
  );
}
