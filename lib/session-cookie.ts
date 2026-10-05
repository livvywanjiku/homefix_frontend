import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE, sealSession, unsealSession, type SessionPayload } from "./session";

/**
 * Writes the session cookie.
 *
 * Only callable from a Route Handler or Server Action — `cookies().set()`
 * throws during Server Component rendering.
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const sealed = await sealSession(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Derived from the token's own expiry so the cookie can never outlive it.
    maxAge: Math.max(0, payload.expiresAt - Math.floor(Date.now() / 1000)),
  });
}

/** Reads and decrypts the session cookie, or null when there is no session. */
export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(SESSION_COOKIE)?.value;

  return sealed ? await unsealSession(sealed) : null;
}

/**
 * Clears the session cookie.
 *
 * Route Handler / Server Action only, for the same reason as createSession.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
