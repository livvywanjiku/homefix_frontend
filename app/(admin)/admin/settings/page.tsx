import type { Metadata } from "next";
import { EmptyPanel, NoAccess, PageIntro, Panel } from "@/components/admin/ui";
import { can, type AdminSetting, type AdminSettingGroup } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { apiFetch } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { SettingsGroupForm } from "./settings-form";

export const metadata: Metadata = { title: "System Settings" };

/*
 * Platform settings (spec §20).
 *
 * One panel and one form per group, in the order Laravel returns them. The
 * grouping is the platform's own — it comes from the `group` column rather than
 * being decided here — so a setting added to the database appears under the
 * heading its author chose without this page being touched.
 *
 * Nothing is written from this screen but a setting's value. The type each one
 * declares is displayed and used to coerce the submission, but it is never
 * itself editable: retyping a stored value would reinterpret every row already
 * in the table, which is a migration, not a form field.
 */
export default async function AdminSettingsPage() {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_settings")) {
    return <NoAccess permission="manage_settings" />;
  }

  const { groups, settings } = await apiFetch<{
    groups: AdminSettingGroup[];
    settings: AdminSetting[];
  }>("/admin/settings", { token: session.token });

  const updated = settings
    .map((setting) => setting.updated_at)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);

  return (
    <div className="flex flex-col gap-5">
      <PageIntro
        description={
          <>
            {settings.length} setting{settings.length === 1 ? "" : "s"} across {groups.length} group
            {groups.length === 1 ? "" : "s"}. Saving a group writes only the values that group
            showed, so it cannot blank a setting on another screen.{" "}
            {settings.filter((setting) => setting.is_public).length} of them are readable by the
            public site; the rest stay server-side.
            {updated ? ` Last changed ${formatRelative(updated)}.` : ""}
          </>
        }
      />

      {groups.length === 0 ? (
        <Panel title="Settings">
          <EmptyPanel label="No settings have been defined. They are created by the settings seeder." />
        </Panel>
      ) : (
        groups.map((group) => (
          <Panel
            key={group.group}
            title={group.label}
            description={
              <>
                {group.settings.length} setting{group.settings.length === 1 ? "" : "s"} · group{" "}
                <span className="font-mono">{group.group}</span>
              </>
            }
          >
            <SettingsGroupForm group={group} />
          </Panel>
        ))
      )}
    </div>
  );
}
