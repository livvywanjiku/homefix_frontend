/**
 * The roles the platform recognises.
 *
 * Mirrors `App\Enums\UserRole` on the Laravel side. Laravel remains the
 * authority — this copy exists so that `proxy.ts` can make optimistic routing
 * decisions and the DAL can name its guards without magic strings.
 */
export const ROLES = ["admin", "customer", "professional"];
export function isRole(value) {
    return typeof value === "string" && ROLES.includes(value);
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
];
/** Narrows a value to a role a visitor is allowed to choose at registration. */
export function isSelfAssignableRole(value) {
    return (typeof value === "string" && SELF_ASSIGNABLE_ROLES.includes(value));
}
/** Where each role lands after signing in. */
export const ROLE_HOME = {
    admin: "/admin",
    customer: "/dashboard",
    professional: "/pro",
};
/** The URL prefixes that require a signed-in user, mapped to who may enter. */
export const PROTECTED_PREFIXES = [
    { prefix: "/admin", roles: ["admin"] },
    { prefix: "/pro", roles: ["professional"] },
    { prefix: "/dashboard", roles: ["customer"] },
];
/** The role a path belongs to, or null when the path is public. */
export function requiredRoleFor(pathname) {
    const match = PROTECTED_PREFIXES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    return match?.roles[0] ?? null;
}
