import "server-only";

import { apiFetch } from "./api";
import type { AuthUser, Item } from "./types";

/**
 * The signed-in account, as `/auth/me` reports it.
 *
 * Kept separate from the auth actions because both workspaces need the same
 * read: the professional profile page shows the avatar above the business
 * editor, and the customer profile page is built almost entirely from it.
 */
export async function getMe(token: string): Promise<AuthUser> {
  const { data } = await apiFetch<Item<AuthUser>>("/auth/me", { token });

  return data;
}
