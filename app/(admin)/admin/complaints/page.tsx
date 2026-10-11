import type { Metadata } from "next";
import { NotBuiltYet } from "@/components/admin/not-yet";

export const metadata: Metadata = { title: "Complaints" };

/*
 * Complaints (spec §20).
 *
 * There is no `complaints` table and no way for a customer to file one, so the
 * console has nothing to triage. The workflow this screen will run — open,
 * under review, resolved or rejected, with a recorded resolution — is also the
 * workflow that needs a decision to be attributable, so it lands with the audit
 * trail already in place rather than before it.
 */
export default function AdminComplaintsPage() {
  return (
    <NotBuiltYet
      title="Complaints"
      permission="view_complaints"
      summary="A queue for disputes raised against a booking, with the evidence attached to each one and the decision that closed it. Complaints are the escalation path when a job goes wrong, so every status change here is a recorded decision with a reason, not a silent edit."
      willShow={[
        "Open, under-review, resolved and rejected complaints, oldest unresolved first.",
        "The booking, customer and professional each complaint concerns.",
        "Evidence a customer attached — and refusal to accept anything but an image or a document.",
        "Resolution notes and the administrator who recorded them.",
        "Filters by status, against whom, and date range, with counts for the queue.",
      ]}
      meanwhile={
        <>
          Nothing yet. A dispute that arises today has to be handled outside the console; the
          booking it concerns is under{" "}
          <span className="font-medium text-admin-text">Bookings</span>.
        </>
      }
    />
  );
}
