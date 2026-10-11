import type { Metadata } from "next";
import { NotBuiltYet } from "@/components/admin/not-yet";

export const metadata: Metadata = { title: "Favorites" };

/*
 * Favourites (spec §20).
 *
 * The `favorites` table exists, with its model relations and a policy method on
 * the professional profile — but no route and no controller anywhere writes to
 * it. So an empty table here would not mean "no customer has saved anyone"; it
 * would mean nothing can save anyone yet. That distinction is the whole reason
 * this page says so rather than drawing a table.
 */
export default function AdminFavoritesPage() {
  return (
    <NotBuiltYet
      title="Favorites"
      permission="view_favorites"
      summary="A read-only view of which professionals customers have saved, and what that says about demand. Saved professionals are a signal about intent — someone is planning to hire — so this is a demand view rather than a moderation queue."
      willShow={[
        "The most-saved professionals, with their verification state and rating.",
        "How many customers have saved each professional, counted in the database.",
        "Saved-but-never-booked professionals, which is where a listing earns interest and loses the job.",
        "Filters by trade, town and date range.",
      ]}
      meanwhile={
        <>
          Nothing yet — and specifically, the table is empty because nothing can write to it. The
          customer-facing favourites feature has not been built, so there is no cohort of saved
          professionals to report on. The demand figures that <em>are</em> real are on{" "}
          <span className="font-medium text-admin-text">Analytics</span>.
        </>
      }
    />
  );
}
