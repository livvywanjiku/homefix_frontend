import { EncryptJWT, jwtDecrypt, type JWTPayload } from "jose";
import { isRole, type Role } from "./roles";

export const SESSION_COOKIE = "homefix_session";

/**
 * The cookie payload.
 *
 * This is the only place the browser-facing session lives. It holds the
 * Sanctum token, which is why the cookie is httpOnly *and* encrypted: a signed
 * JWT would leave the token readable in the base64url body to anyone who can
 * read the cookie jar.
 */
export type SessionPayload = {
  /** Sanctum personal access token. Never sent to the browser. */
  token: string;
  userId: number;
  role: Role;
  /** Epoch seconds, mirroring the token's own expiry. */
  expiresAt: number;
};

/*
 * This module deliberately does NOT import "server-only". The proxy runs
 * outside the React Server Components bundle, where that package's guard
 * throws rather than no-ops — see its package.json "react-server" condition.
 * The cookie-store half of the session, which genuinely must not reach a
 * client bundle, lives in ./session-cookie.ts and does carry the marker.
 */

/**
 * Derives the 256-bit AES key from SESSION_SECRET.
 *
 * A single SHA-256 is sufficient key derivation here because the secret is
 * expected to be 32 bytes of CSPRNG output (see .env.example), not a
 * human-chosen password that would need a slow KDF.
 */
async function secretKey(): Promise<Uint8Array> {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Copy .env.example to .env.local and generate one with `openssl rand -base64 32`.",
    );
  }

  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)),
  );
}

/** Narrows decrypted JWE claims back to a SessionPayload, or null if malformed. */
function toSessionPayload(claims: JWTPayload): SessionPayload | null {
  const { token, userId, role, expiresAt } = claims;

  if (typeof token !== "string" || token === "") return null;
  if (typeof userId !== "number") return null;
  if (!isRole(role)) return null;
  if (typeof expiresAt !== "number") return null;

  return { token, userId, role, expiresAt };
}

/**
 * Encrypts a session into a JWE compact string.
 *
 * `dir` + `A256GCM` uses the derived key directly, so the cookie carries no
 * key material of its own.
 */
export async function sealSession(payload: SessionPayload): Promise<string> {
  return await new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .encrypt(await secretKey());
}

/**
 * Decrypts a sealed cookie.
 *
 * Returns null for anything untrustworthy — wrong key, tampered, malformed, or
 * expired — because every one of those means the same thing to a caller: there
 * is no usable session.
 */
export async function unsealSession(
  sealed: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtDecrypt(sealed, await secretKey(), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    });

    return toSessionPayload(payload);
  } catch {
    return null;
  }
}
