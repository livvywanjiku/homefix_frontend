import type { Metadata } from "next";
import { NotBuiltYet } from "@/components/admin/not-yet";

export const metadata: Metadata = { title: "Availability" };

/*
 * Availability (spec §20).
 *
 * Working hours and blocked dates are real rows — professionals fill them in
 * from their own workspace, and the public profile shows the weekly grid — but
 * there is no administrative endpoint over them, which is why `view_availability`
 * is seeded and unused. This screen is for oversight: which professionals have
 * never set hours, whose calendars are blocked, and the exceptions that explain
 * a gap in cover.
 */
export default function AdminAvailabilityPage() {
  return (
    <NotBuiltYet
      title="Availability"
      permission="view_availability"
      summary="Working hours and blocked dates across the platform. A professional who never fills the grid in is invisible to date-filtered search, so this screen is as much about finding the gaps as reading the schedules."
      willShow={[
        "The weekly working hours of each professional, as a grid rather than a list of rows.",
        "Blocked dates and date-specific overrides, with the reason where one was given.",
        "Professionals who have never set availability, which is the group whose listings cannot be found by date.",
        "Professionals whose hours have not changed in a long time, which usually means they are stale.",
        "Filters by town, verification state and whether hours are set at all.",
      ]}
      meanwhile={
        <>
          A professional&rsquo;s weekly hours are shown on their{" "}
          <span className="font-medium text-admin-text">public profile</span>, which is where
          customers read them. From the console, the professional&rsquo;s record under{" "}
          <span className="font-medium text-admin-text">Professionals</span> is where you reach it
          from, but the hours themselves are not rendered there yet.
        </>
      }
    />
  );
}
