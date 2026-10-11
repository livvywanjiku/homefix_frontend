import "server-only";

import { cache } from "react";
import { can, type AdminPermission } from "./admin";
import { apiFetch } from "./api";
import { requireRole } from "./dal";
import { isRole, type Role } from "./roles";
import type { SessionPayload } from "./session";

/**
 * The signed-in administrator, and their own grant list.
 *
 * Wrapped in `cache()` so the layout and the page beneath it share one request
 * to `/auth/me`: the console needs the account in the shell (for the menu and
 * the avatar) and in the page (to decide which panels it may fetch), and asking
 * Laravel twice for the same row on every render would be waste, not safety.
 *
 * The permissions are read live from the account rather than being baked into
 * the session cookie, which is what makes a grant revoked in the database take
 * effect on the next request instead of at the next sign-in.
 */
export type AdminAccount = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  roles: Role[];
  permissions: string[];
};

export const currentAdmin = cache(
  async (): Promise<{ session: SessionPayload; account: AdminAccount }> => {
    const session = await requireRole("admin", "superadmin");

    const { data } = await apiFetch<{
      data: {
        id: number;
        name: string;
        email: string;
        avatar_url: string | null;
        roles?: string[];
        permissions?: string[];
      };
    }>("/auth/me", { token: session.token });

    return {
      session,
      account: {
        id: data.id,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatar_url,
        roles: (data.roles ?? [session.role]).filter(isRole),
        permissions: data.permissions ?? [],
      },
    };
  },
);

/**
 * Runs a request only when the administrator holds the permission.
 *
 * Returning null rather than throwing is deliberate: an administrator without
 * `view_bookings` should see the dashboard's other panels, not an error page
 * where the bookings panel would have been. The permission test is the same
 * {@see can} the sidebar uses, so the menu and the fetches cannot disagree.
 */
export async function fetchIf<T>(
  granted: readonly string[],
  permission: AdminPermission,
  load: () => Promise<T>,
): Promise<T | null> {
  if (!can(granted, permission)) return null;

  return load();
}

/* ── Query strings ─────────────────────────────────────────────────────── */

/**
 * One value out of `searchParams`.
 *
 * `searchParams` hands back an array when a key is repeated, and an empty string
 * when a field was submitted blank; neither is a filter, so both are dropped.
 * Shared here rather than redefined per page because the console has twenty-odd
 * screens that all read the same six keys.
 */
export function one(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * The named filters, taken from `searchParams` and handed to Laravel verbatim.
 *
 * Only the keys a page names are forwarded. That is not cosmetic: an unfiltered
 * pass-through would let a hand-edited URL post arbitrary query parameters to the
 * API, and the API's own validation would then have to reject things the page
 * never meant to offer.
 */
export function filters(
  params: Record<string, string | string[] | undefined>,
  keys: readonly string[],
): Record<string, string> {
  const picked: Record<string, string> = {};

  for (const key of keys) {
    const value = one(params[key]);

    if (value !== undefined) picked[key] = value;
  }

  return picked;
}
