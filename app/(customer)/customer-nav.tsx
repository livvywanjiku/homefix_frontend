"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The customer workspace's section nav.
 *
 * A client component only because the active state needs the current path, and
 * a Server Component cannot read it. It fetches nothing and holds no state
 * beyond `usePathname`, so nothing here needs the session.
 *
 * Sections are added as they are built — a link to a page that does not exist
 * yet is worse than no link.
 */
const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/requests", label: "My requests" },
  { href: "/professionals", label: "Find a professional" },
];

export function CustomerNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Customer workspace"
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {LINKS.map(({ href, label }) => {
        // `/dashboard` would otherwise match every child; exact match for the index.
        const active =
          href === "/dashboard" ? pathname === href : pathname.startsWith(href);

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
