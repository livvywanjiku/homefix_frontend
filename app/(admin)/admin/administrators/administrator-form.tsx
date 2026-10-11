"use client";

import { useActionState } from "react";
import { AdminInput, AdminSelect, FormField } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { AdminPasswordInput } from "@/components/ui/password-input";
import { ADMIN_ROLE_LABEL, type AdminUserRow } from "@/lib/admin";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { saveAdministratorAction } from "./actions";

/**
 * Add or edit one administrator.
 *
 * One component for both, as everywhere else in the console: the fields are the
 * same and the presence of an id is what decides between a POST and a PUT.
 *
 * `self` is what makes the role picker read-only on the signed-in
 * administrator's own row. Laravel refuses a self-role-change, so offering the
 * control would be offering something that cannot succeed — and a disabled
 * select submits nothing, which is precisely the request the API expects.
 */
export function AdministratorForm({
  administrator,
  self = false,
}: {
  administrator?: AdminUserRow;
  self?: boolean;
}) {
  const [state, formAction] = useActionState(saveAdministratorAction, INITIAL_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {administrator ? <input type="hidden" name="id" value={administrator.id} /> : null}

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" error={state.errors?.name}>
          <AdminInput name="name" defaultValue={administrator?.name ?? ""} required maxLength={120} />
        </FormField>

        <FormField label="Email" error={state.errors?.email}>
          <AdminInput
            type="email"
            name="email"
            defaultValue={administrator?.email ?? ""}
            required
            maxLength={255}
          />
        </FormField>

        <FormField label="Phone" error={state.errors?.phone} hint="Optional.">
          <AdminInput name="phone" defaultValue={administrator?.phone ?? ""} maxLength={20} />
        </FormField>

        <FormField
          label="Role"
          error={state.errors?.role}
          hint={
            self
              ? "You cannot change your own role — another super administrator has to do it."
              : "Administrators run the platform; super administrators additionally manage administrators, roles and settings."
          }
        >
          {self ? (
            <>
              {/* Submitted as nothing at all: a disabled control is not sent. */}
              <AdminSelect disabled defaultValue={administrator?.role ?? "superadmin"}>
                <option value={administrator?.role ?? "superadmin"}>
                  {ADMIN_ROLE_LABEL[administrator?.role ?? "superadmin"] ?? "Administrator"}
                </option>
              </AdminSelect>
            </>
          ) : (
            <AdminSelect name="role" defaultValue={administrator?.role ?? "admin"} required>
              <option value="admin">Administrator</option>
              <option value="superadmin">Super Administrator</option>
            </AdminSelect>
          )}
        </FormField>

        <FormField
          label={administrator ? "New password" : "Password"}
          error={state.errors?.password}
          hint={
            administrator
              ? "Leave blank to keep the current password."
              : "At least the length the platform's password rules require."
          }
        >
          <AdminPasswordInput
            name="password"
            autoComplete="new-password"
            required={administrator === undefined}
          />
        </FormField>

        <FormField
          label="Confirm password"
          error={state.errors?.password_confirmation}
          hint={administrator ? "Only needed when changing the password." : undefined}
        >
          <AdminPasswordInput
            name="password_confirmation"
            autoComplete="new-password"
            required={administrator === undefined}
          />
        </FormField>
      </div>

      <div>
        <SubmitButton size="sm" pendingLabel="Saving…">
          {administrator ? "Save changes" : "Add administrator"}
        </SubmitButton>
      </div>
    </form>
  );
}
