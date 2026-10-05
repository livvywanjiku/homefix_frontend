import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import { ROLE_HOME, type Role } from "./roles";
import { readSession } from "./session-cookie";
import type { SessionPayload } from "./session";

/**
 * The current session, decrypted once per request.
 *
 * `cache()` memoises across a single render pass, so a layout, a page and
 * several components can each ask for the session without paying for repeated
 * decryption.
 */
export const verifySession = cache(readSession);

/**
 * The session, or a redirect to the sign-in page.
 *
 * This is the authoritative gate for Server Components and Server Actions.
 * `proxy.ts` also redirects, but only optimistically and on a matcher — it is
 * trivially bypassed by a Server Action on an unmatched path, so every
 * protected surface must call this too.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await verifySession();

  if (!session) redirect("/login");

  return session;
}

/**
 * The session, when the signed-in user holds one of the given roles.
 *
 * Anyone signed in under the wrong role is sent to their own home rather than
 * to the sign-in page — they are authenticated, just not authorised here.
 */
export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();

  if (!roles.includes(session.role)) redirect(ROLE_HOME[session.role]);

  return session;
}

/** The bearer token for Laravel calls, or null when signed out. */
export async function getToken(): Promise<string | null> {
  const session = await verifySession();

  return session?.token ?? null;
}
