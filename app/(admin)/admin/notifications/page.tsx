import type { Metadata } from "next";
import { NotBuiltYet } from "@/components/admin/not-yet";

export const metadata: Metadata = { title: "Notifications" };

/*
 * Notifications (spec §20).
 *
 * Laravel's `notifications` table has not been migrated and no notification
 * class exists, so the platform sends none. This screen is for the *platform's*
 * view of them — how many were generated, what for, and what failed to send —
 * which is a different thing from the bell each user will get in their own
 * header.
 */
export default function AdminNotificationsPage() {
  return (
    <NotBuiltYet
      title="Notifications"
      permission="view_notifications"
      summary="Delivery oversight for the notifications the platform generates: how many were sent for each event, through which channel, and which ones no user has read. This reads the platform's outbound record; each user's own bell reads their own."
      willShow={[
        "Volume per notification type, so a spike or a silence is both visible.",
        "Channel breakdown — database always, broadcast only when Reverb is configured.",
        "Unread and ageing counts per type, which is how a stuck queue shows itself.",
        "Composition of a notification as it was actually stored.",
      ]}
      meanwhile={
        <>
          Nothing yet. No notification class has been written, so the platform does not send any —
          the panel on{" "}
          <span className="font-medium text-admin-text">Dashboard</span> reports real system health,
          including whether a queue worker is running, and will say so plainly if one is not.
        </>
      }
    />
  );
}
