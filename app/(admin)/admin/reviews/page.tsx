import type { Metadata } from "next";
import { NotBuiltYet } from "@/components/admin/not-yet";

export const metadata: Metadata = { title: "Reviews" };

/*
 * Reviews (spec §20).
 *
 * There is no `reviews` table, and nothing can write a rating: the review slice
 * — eligibility tied to a completed booking, one review per booking, the
 * recalculation of the professional's average — has not been built. The rating
 * columns on a professional profile therefore read zero for everyone, and a
 * moderation screen over an empty set would look like a platform nobody has
 * rated rather than one that cannot yet be rated.
 */
export default function AdminReviewsPage() {
  return (
    <NotBuiltYet
      title="Reviews"
      permission="view_reviews"
      summary="Moderation of customer reviews: what was said, by whom, against which completed job, and what a professional replied. A review is only ever eligible on a booking that reached completed, and the database — not this screen — is what makes a second review of the same booking impossible."
      willShow={[
        "Every review with its ratings across quality, communication, punctuality and professionalism.",
        "The booking it was written against, so a review can be traced to work that actually happened.",
        "Professional responses, and whether a response is still owed.",
        "Hide and unhide as a moderation decision, recorded in the audit trail with its reason.",
        "Filters by rating, professional, date range and hidden state.",
      ]}
      meanwhile={
        <>
          The rating average and count on each professional profile are real columns, and are shown
          under <span className="font-medium text-admin-text">Professionals</span> — but they sit at
          zero, because no review can be written yet. That is a gap in the platform, not a verdict
          on the professionals listed.
        </>
      }
    />
  );
}
