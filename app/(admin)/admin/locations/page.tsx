import type { Metadata } from "next";
import Link from "next/link";
import { NotBuiltYet } from "@/components/admin/not-yet";

export const metadata: Metadata = { title: "Locations" };

/*
 * Locations (spec §20).
 *
 * The towns themselves are real and populated — the catalogue seeder creates
 * fifteen Kenyan towns with coordinates — and where the demand sits is already
 * reported, town by town, under Analytics. What does not exist is a write
 * endpoint, so this screen cannot yet add a town, correct one's coordinates or
 * retire one that is no longer served. `manage_locations` is seeded and unused.
 */
export default function AdminLocationsPage() {
  return (
    <NotBuiltYet
      title="Locations"
      permission="view_locations"
      summary="The towns HomeFix covers, with their coordinates, how many professionals work in each and how many service requests have been raised there. Editing the list — adding a town, correcting a coordinate, retiring one — is what this screen is for; the read side already exists under Analytics."
      willShow={[
        "Every location with its latitude and longitude and whether it is active.",
        "Professionals based in each town and professionals covering it as a service area.",
        "Service requests raised there, and the trend over the selected range.",
        "Towns with demand and no professionals, which is the coverage gap worth acting on.",
        "Add, edit and retire a location — every change recorded in the audit trail.",
      ]}
      meanwhile={
        <>
          The town-by-town breakdown is already live:{" "}
          <Link href="/admin/analytics" className="font-medium text-admin-accent hover:underline">
            Analytics
          </Link>{" "}
          lists each location&rsquo;s requests and professionals, flags the ones with no cover, and
          shows the coordinates the platform holds for it.
        </>
      }
    />
  );
}
