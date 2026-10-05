import Link from "next/link";

export type Tab = { href: string; label: string; count?: number };

/**
 * URL-driven tabs.
 *
 * Deliberately links rather than a client component with state: each tab is a
 * real address, so it survives a refresh, can be shared, and lets the page
 * itself stay a Server Component that reads `searchParams`. Active state is
 * decided by the caller, which already knows which tab it is rendering.
 */
export function Tabs({
  tabs,
  activeHref,
  className = "",
}: {
  tabs: Tab[];
  activeHref: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Sections"
      className={`flex gap-1 overflow-x-auto border-b border-line ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.href === activeHref;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:border-line hover:text-foreground"
            }`}
          >
            {tab.label}

            {tab.count !== undefined ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  active ? "bg-brand-50 text-brand-600" : "bg-surface text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
