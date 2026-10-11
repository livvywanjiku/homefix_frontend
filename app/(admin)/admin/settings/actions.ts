"use server";

import { revalidatePath } from "next/cache";
import { can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { send } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * Platform settings (spec §20).
 *
 * The form submits one group at a time, and only the keys it carried are sent.
 * `UpdateSettingsRequest` treats the write as partial on purpose, so a screen
 * saving "payments" cannot blank a value on "general" that it never displayed.
 *
 * Each field is coerced to the type the setting declares before it is sent: a
 * checkbox arrives as "on", and Laravel would store the string. Sending a real
 * boolean means the value the console wrote is the value the platform reads.
 */

/** The submitted values, keyed by setting key, as `settings[n][key|value]`. */
function submitted(formData: FormData): { key: string; value: unknown }[] {
  const keys = formData.getAll("key").filter((key): key is string => typeof key === "string");

  return keys.map((key) => {
    const type = formData.get(`type:${key}`);
    const raw = formData.get(`value:${key}`);

    if (type === "boolean") {
      // An unchecked box submits nothing at all, which means "off" — not
      // "unset", and not the string "on" that Laravel would store verbatim.
      return { key, value: raw === "on" || raw === "true" || raw === "1" };
    }

    if (type === "integer") {
      const value = typeof raw === "string" ? raw.trim() : "";

      return { key, value: value === "" ? null : Number(value) };
    }

    /*
     * Scalars only. A structured setting is shown read-only on the form — see
     * `StructuredSetting` — so it never reaches here, and there is deliberately
     * no JSON branch to coerce it: parsing free text into a structure is how the
     * marker the Roles screen owns would end up holding a value the seeder
     * misreads.
     */
    const value = typeof raw === "string" ? raw : "";

    return { key, value: value === "" ? null : value };
  });
}

export async function saveSettingsAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_settings")) {
    return {
      status: "error",
      message: "Your account does not hold the manage_settings permission.",
    };
  }

  const settings = submitted(formData);

  if (settings.length === 0) {
    return { status: "error", message: "There was nothing to save." };
  }

  const failure = await send(session.token, "PUT", "/admin/settings", { settings });

  revalidatePath("/admin/settings");

  if (failure) return failure;

  return {
    status: "success",
    message: `Saved ${settings.length} setting${settings.length === 1 ? "" : "s"}.`,
  };
}
