"use client";

import { useActionState, useState } from "react";
import { AdminInput } from "@/components/admin/ui";
import { SubmitButton } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { AdminPermissionOption, AdminRoleRow } from "@/lib/admin";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { saveRolePermissionsAction } from "./actions";

/**
 * One role's permission set.
 *
 * Split into two components because the read-only case returns early: a single
 * component that called `useState` after that branch would render fewer hooks
 * the moment a role's editability changed, which React treats as a crash.
 *
 * The checkboxes keep the order the API sent them in, which is the order of the
 * `Permission` enum — and that enum is already grouped by area, so the list
 * reads as "the marketplace capabilities, then the administrative ones" without
 * this component having to know which is which.
 *
 * Reserved permissions are shown disabled rather than hidden. An administrator
 * asking "can this role manage administrators?" needs to find the answer
 * "never, by design" rather than an absence they might read as an oversight.
 *
 * The granted set is held in state rather than left to the browser, because the
 * filter unmounts the boxes it hides: an unchecked box and an unrendered box
 * both submit nothing, and the API reads absence as revocation. With the held
 * set in state, a permission that is filtered out of view still travels with the
 * form — so narrowing the list to find one box can never revoke the other
 * twenty-nine on the way to ticking it.
 */
export function RoleEditor({
  role,
  permissions,
}: {
  role: AdminRoleRow;
  permissions: AdminPermissionOption[];
}) {
  if (!role.is_editable) {
    return (
      <p className="rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-3 text-sm text-admin-muted">
        The super administrator holds every permission by definition, so there is nothing to edit —
        changing it could only ever take something away. Its access is the union of everything on
        this page.
      </p>
    );
  }

  return <PermissionForm role={role} permissions={permissions} />;
}

function PermissionForm({
  role,
  permissions,
}: {
  role: AdminRoleRow;
  permissions: AdminPermissionOption[];
}) {
  const [state, formAction] = useActionState(saveRolePermissionsAction, INITIAL_FORM_STATE);
  const [filter, setFilter] = useState("");
  const [granted, setGranted] = useState(() => new Set(role.permissions));

  const term = filter.trim().toLowerCase();
  const matching =
    term === ""
      ? permissions
      : permissions.filter(
          (permission) =>
            permission.label.toLowerCase().includes(term) ||
            permission.value.toLowerCase().includes(term),
        );

  const visible = new Set(matching.map((permission) => permission.value));

  /*
   * Grants the filter is hiding, carried as hidden fields so the submission
   * still describes the whole role rather than only the part on screen.
   */
  const hidden = [...granted].filter((value) => !visible.has(value));

  function toggle(value: string, checked: boolean): void {
    setGranted((previous) => {
      const next = new Set(previous);

      if (checked) {
        next.add(value);
      } else {
        next.delete(value);
      }

      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={role.id} />

      {hidden.map((value) => (
        <input key={value} type="hidden" name="permissions" value={value} />
      ))}

      {state.status !== "idle" && state.message ? (
        <FormMessage tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </FormMessage>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <AdminInput
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter permissions"
          className="max-w-xs"
          aria-label="Filter permissions"
        />
        <span className="text-xs text-admin-muted">
          {granted.size} held of {permissions.length}
          {term === "" ? "" : ` · ${matching.length} matching`}
          {role.is_customised ? " · edited by hand, so the seeder leaves it alone" : ""}
        </span>
      </div>

      {matching.length === 0 ? (
        <p className="rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 py-4 text-sm text-admin-muted">
          No permission matches that filter. Nothing has been changed by filtering — the role still
          holds the {granted.size} permission{granted.size === 1 ? "" : "s"} it held before.
        </p>
      ) : (
        <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {matching.map((permission) => (
            <li key={permission.value}>
              <label className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="permissions"
                  value={permission.value}
                  checked={granted.has(permission.value)}
                  onChange={(event) => toggle(permission.value, event.target.checked)}
                  disabled={permission.reserved}
                  className="mt-0.5 h-4 w-4 accent-admin-accent"
                />
                <span className={permission.reserved ? "text-admin-muted" : undefined}>
                  {permission.label}
                  {permission.reserved ? (
                    <span className="block text-xs">
                      Reserved to the super administrator and cannot be granted
                    </span>
                  ) : (
                    <span className="block font-mono text-xs text-admin-muted">
                      {permission.value}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton size="sm" pendingLabel="Saving…">
          Save permissions
        </SubmitButton>
        <p className="text-xs text-admin-muted">
          Saving replaces the whole set: the {granted.size} permission
          {granted.size === 1 ? "" : "s"} currently ticked are what the role will hold. Clearing
          every box leaves it with no access at all.
        </p>
      </div>
    </form>
  );
}
