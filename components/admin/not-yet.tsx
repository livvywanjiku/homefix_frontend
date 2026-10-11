import type { ReactNode } from "react";
import { NoAccess, PageIntro, Panel, UnavailablePanel } from "./ui";
import { can, type AdminPermission } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";

/**
 * The console's screen for an area the API does not serve yet.
 *
 * Seven entries in the sidebar — payments, reviews, complaints, locations,
 * availability, favourites, notifications — are named by the specification but
 * have no admin endpoint behind them. Rendering an empty table for each would
 * say "there is nothing here", and a row of zeroes would say it more loudly;
 * both are untrue. This says what is actually the case: the platform does not
 * expose this data to the console yet, and here is what will appear when it
 * does.
 *
 * The page still runs the permission gate and still returns the same
 * `NoAccess` panel a working page would, so an administrator who lacks the
 * grant learns that rather than reading a "not built" notice they were never
 * entitled to see.
 *
 * `meanwhile` is where a page can point at something real that covers part of
 * the same ground today — the booking record already carries the payment
 * status, for instance — so the screen is not a dead end.
 */
export async function NotBuiltYet({
  title,
  permission,
  summary,
  willShow,
  meanwhile,
}: {
  title: string;
  permission: AdminPermission;
  summary: string;
  willShow: string[];
  meanwhile?: ReactNode;
}) {
  const { account } = await currentAdmin();

  if (!can(account.permissions, permission)) {
    return <NoAccess permission={permission} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageIntro description={summary} />

      <UnavailablePanel title={title} reason={`No endpoint serves this yet, so nothing is listed and no totals are shown. The screen is in place and gated on the ${permission} permission, ready for the data.`} />

      <Panel title="What this screen will show">
        <ul className="flex flex-col gap-2 text-sm">
          {willShow.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-admin-accent" />
              <span className="text-admin-muted">{item}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {meanwhile ? (
        <Panel title="Where to find this today" description="The closest thing the console can already show.">
          <div className="text-sm text-admin-muted">{meanwhile}</div>
        </Panel>
      ) : null}
    </div>
  );
}
