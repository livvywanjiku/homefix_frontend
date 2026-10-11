"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The professional workspace's section nav.
 *
 * A client component only because the active state needs the current path, and
 * a Server Component cannot read it. It fetches nothing and holds no state
 * beyond `usePathname`, so nothing here needs the session.
 */
const LINKS = [
  { href: "/pro", label: "Overview" },
  { href: "/pro/requests", label: "Job board" },
  { href: "/pro/profile", label: "Profile" },
  { href: "/pro/services", label: "Services" },
  { href: "/pro/availability", label: "Availability" },
  { href: "/pro/portfolio", label: "Portfolio" },
  { href: "/pro/verification", label: "Verification" },
];

export function ProNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Professional workspace"
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {LINKS.map(({ href, label }) => {
        // `/pro` would otherwise match every child; exact match for the index.
        const active = href === "/pro" ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:border-line hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
