import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME, requiredRolesFor } from "@/lib/roles";
import { SESSION_COOKIE, unsealSession } from "@/lib/session";

/** Pages that a signed-in user has no reason to see. */
const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];

function isGuestOnly(pathname: string): boolean {
  return GUEST_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Optimistic routing for signed-in users, and nothing more.
 *
 * This reads the encrypted session cookie and redirects, which keeps the
 * common cases fast and avoids rendering a dashboard shell only to bounce the
 * user. It is deliberately NOT the authorisation boundary: a Server Action on
 * an unmatched path never reaches here, and nothing here talks to Laravel. The
 * real check is `requireRole()` in the DAL on every protected page.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const requiredRoles = requiredRolesFor(pathname);
  const guestOnly = isGuestOnly(pathname);

  if (requiredRoles.length === 0 && !guestOnly) return NextResponse.next();

  const sealed = request.cookies.get(SESSION_COOKIE)?.value;
  const session = sealed ? await unsealSession(sealed) : null;

  // A signed-in user hitting /login is sent to their own home rather than
  // being shown a form that would replace the session they already have.
  if (guestOnly) {
    return session
      ? NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url))
      : NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);

    /*
     * The whole target, query string included. A guest picking a service on the
     * public catalogue lands on `/dashboard/requests/new?service=7`, and
     * dropping the query would deliver them to an empty wizard — having been
     * told their intended action was preserved.
     */
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    return NextResponse.redirect(loginUrl);
  }

  // Authenticated but in the wrong area: send them somewhere they can act,
  // not to the sign-in page they are already past.
  if (!requiredRoles.includes(session.role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Everything except API routes, Next's static output, and metadata files.
   * An unmatched path also skips this file entirely, which is why the DAL
   * re-checks rather than trusting that this ran.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
