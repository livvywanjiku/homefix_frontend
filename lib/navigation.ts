import { ROLE_HOME, requiredRoleFor, type Role } from "./roles";

/*
 * Backslash and C0 control characters, which have no business in a path.
 * The control-character range is deliberate — a raw newline or tab in a
 * redirect target is how header-injection style bugs start.
 */
const UNSAFE = /[\\\u0000-\u001f]/;

/**
 * A safe post-sign-in destination, falling back to the role's home.
 *
 * The value arrives from `?next=`, so it is attacker-controlled. The obvious
 * `startsWith("/")` check is NOT sufficient on its own: `//evil.com` and
 * `/\evil.com` both begin with a slash yet are protocol-relative URLs that a
 * browser resolves to another origin, which is a textbook open redirect.
 *
 * The destination must also belong to the role that just signed in — otherwise
 * the redirect simply bounces off `proxy.ts`, costing a round trip to land
 * somewhere else anyway.
 */
export function safeNextPath(value: string | null | undefined, role: Role): string {
  const fallback = ROLE_HOME[role];

  if (!value || !value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (UNSAFE.test(value)) return fallback;

  // Compare the path only; a query string or fragment is not part of the route.
  const pathname = value.split(/[?#]/)[0];
  const required = requiredRoleFor(pathname);

  return required === null || required === role ? value : fallback;
}
