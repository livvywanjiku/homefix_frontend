"use client";

import { useActionState } from "react";
import { AdminCheck, AdminInput, FormField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { AdminSetting, AdminSettingGroup } from "@/lib/admin";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { saveSettingsAction } from "./actions";

/**
 * One group of platform settings.
 *
 * A form per group rather than one enormous form for the page, because the API
 * treats the write as partial and a group is the unit an administrator thinks
 * in: saving "marketplace" should not touch a value on "system" they never saw.
 *
 * The input each setting gets is decided by the `type` the setting declares —
 * the same column Laravel casts by — so a checkbox is stored as a boolean and a
 * number as a number rather than both arriving as strings.
 *
 * `key` and `type` travel as hidden fields under namespaced names
 * (`type:<key>`, `value:<key>`) rather than as a parallel array, because a
 * checkbox that is switched off submits nothing at all and two parallel arrays
 * would then fall out of step.
 */
export function SettingsGroupForm({ group }: { group: AdminSettingGroup }) {
  const [state, formAction] = useActionState(saveSettingsAction, INITIAL_FORM_STATE);

  // A structured setting is bookkeeping rather than configuration — see
  // `StructuredSetting` — so a group may hold nothing an administrator can type
  // into, and a Save button over no fields would be a lie about what it does.
  const editable = group.settings.filter((setting) => setting.type !== "json");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      {editable.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {editable.map((setting) => (
            <SettingField key={setting.key} setting={setting} />
          ))}
        </div>
      ) : null}

      {group.settings.some((setting) => setting.type === "json") ? (
        <div className="flex flex-col gap-4">
          {group.settings
            .filter((setting) => setting.type === "json")
            .map((setting) => (
              <StructuredSetting key={setting.key} setting={setting} />
            ))}
        </div>
      ) : null}

      {editable.length > 0 ? (
        <div>
          <SubmitButton size="sm" pendingLabel="Saving…">
            Save {group.label.toLowerCase()}
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}

function SettingField({ setting }: { setting: AdminSetting }) {
  const name = `value:${setting.key}`;
  const label = setting.label ?? setting.key;

  /*
   * The key and the declared type travel with every field. The type is what the
   * action coerces by, and it comes from the API rather than from the control
   * that happens to be rendered — so the two cannot disagree.
   */
  const carriers = (
    <>
      <input type="hidden" name="key" value={setting.key} />
      <input type="hidden" name={`type:${setting.key}`} value={setting.type} />
    </>
  );

  if (setting.type === "boolean") {
    return (
      <div>
        {carriers}
        <AdminCheck
          name={name}
          label={label}
          hint={setting.description ?? undefined}
          defaultChecked={setting.value === true}
        />
        <p className="mt-1 ml-6.5 font-mono text-xs text-admin-muted">
          {setting.key}
          {setting.is_public ? " · public" : ""}
        </p>
      </div>
    );
  }

  return (
    <FormField
      label={label}
      hint={
        <>
          {setting.description ? <span className="block">{setting.description}</span> : null}
          <span className="block font-mono text-xs">
            {setting.key}
            {setting.is_public ? " · public" : ""}
          </span>
        </>
      }
    >
      {carriers}
      <AdminInput
        type={setting.type === "integer" ? "number" : "text"}
        name={name}
        defaultValue={String(setting.value ?? "")}
      />
    </FormField>
  );
}

/**
 * A setting whose value is a structure rather than a scalar, shown read-only.
 *
 * The one such row this platform has is the marker the Roles screen writes when
 * an administrator edits a role's permissions, and the seeder reads it to decide
 * which roles are an administrator's decision. Hand-editing it is worse than
 * useless: an invalid value reads back as "no role has been customised", so the
 * next `db:seed` would quietly restore grants somebody deliberately changed.
 *
 * So the rule is on the declared type rather than on the key — no `json` setting
 * here is a value a person should type — and the checkbox that would let it be
 * edited is not rendered. The value is still shown in full, because a screen
 * that hides what it will not let you change is a screen you cannot audit.
 */
function StructuredSetting({ setting }: { setting: AdminSetting }) {
  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface/60 px-4 py-3">
      <p className="text-sm font-medium">{setting.label ?? setting.key}</p>
      <p className="mt-0.5 font-mono text-xs text-admin-muted">{setting.key}</p>
      {setting.description ? (
        <p className="mt-1 text-xs text-admin-muted">{setting.description}</p>
      ) : null}
      <pre className="mt-2 overflow-x-auto rounded-md border border-admin-border bg-admin-card px-3 py-2 text-xs">
        {JSON.stringify(setting.value ?? null, null, 2)}
      </pre>
      <p className="mt-2 text-xs text-admin-muted">
        Maintained by the screen that owns it, not typed by hand.
      </p>
    </div>
  );
}
