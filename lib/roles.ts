/**
 * The roles the platform recognises.
 *
 * Mirrors `App\Enums\UserRole` on the Laravel side. Laravel remains the
 * authority — this copy exists so that `proxy.ts` can make optimistic routing
 * decisions and the DAL can name its guards without magic strings.
 */
export const ROLES = ["admin", "customer", "professional", "superadmin"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/**
 * Roles a visitor may choose at registration.
 *
 * Mirrors `UserRole::selfAssignable()` on the Laravel side, and is likewise
 * derived so that adding a privileged role to ROLES cannot silently make it
 * selectable — the client schema and the server rule have to agree.
 */
export const SELF_ASSIGNABLE_ROLES = [
  "customer",
  "professional",
] as const satisfies readonly Role[];

/** Narrows a value to a role a visitor is allowed to choose at registration. */
export function isSelfAssignableRole(
  value: unknown,
): value is (typeof SELF_ASSIGNABLE_ROLES)[number] {
  return (
    typeof value === "string" && (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin",
  superadmin: "/admin",
  customer: "/dashboard",
  professional: "/pro",
};

/** The URL prefixes that require a signed-in user, mapped to who may enter. */
export const PROTECTED_PREFIXES: { prefix: string; roles: Role[] }[] = [
  // Both administrative roles share one console. Which *screens* each may open
  // is decided by their permissions, not here — this is only the routing gate.
  { prefix: "/admin", roles: ["admin", "superadmin"] },
  { prefix: "/pro", roles: ["professional"] },
  { prefix: "/dashboard", roles: ["customer"] },
];

/** The roles a path admits, or an empty list when the path is public. */
export function requiredRolesFor(pathname: string): Role[] {
  const match = PROTECTED_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return match?.roles ?? [];
}

/**
 * The role a path belongs to, or null when the path is public.
 *
 * Kept for callers that only need to know whether a path is protected at all.
 * Where the answer decides access, use {@see requiredRolesFor} — `/admin` now
 * belongs to two roles, and a single-value answer would lock one of them out.
 */
export function requiredRoleFor(pathname: string): Role | null {
  return requiredRolesFor(pathname)[0] ?? null;
}
