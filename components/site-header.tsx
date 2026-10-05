import Link from "next/link";
import { ROLE_HOME } from "@/lib/roles";
import { verifySession } from "@/lib/dal";
import { logoutAction } from "@/lib/actions/session";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/professionals", label: "Find a professional" },
];

const ROLE_LABEL = {
  admin: "Admin console",
  customer: "My dashboard",
  professional: "Pro dashboard",
} as const;

/**
 * The site header, on the brand's navy.
 *
 * A Server Component so it can read the session and render the signed-in state
 * without a client round trip or a flash of the signed-out header.
 */
export async function SiteHeader() {
  const session = await verifySession();

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span aria-hidden="true">🏠</span> HomeFix
          <span className="text-accent"> Connect</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-white/80 transition-colors hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {session ? (
            <>
              <Link
                href={ROLE_HOME[session.role]}
                className="text-white/80 transition-colors hover:text-white"
              >
                {ROLE_LABEL[session.role]}
              </Link>

              {/* A form, not a link: signing out changes server state, so it
                  must not be something a prefetch or a crawler can trigger. */}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-white/25 px-4 py-2 transition-colors hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-white/80 transition-colors hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-accent px-4 py-2 font-medium text-navy transition-colors hover:bg-accent-600"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
