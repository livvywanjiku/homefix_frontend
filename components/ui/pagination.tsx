import Link from "next/link";

export type PaginatorLink = { url: string | null; label: string; active: boolean };

/**
 * Renders a Laravel paginator's link set.
 *
 * Laravel hands back prev/next plus a window of numbered pages, each with an
 * already-built URL. Passing those through as-is keeps the query string (the
 * active search filters) intact without this component having to know what the
 * filters are.
 *
 * Prev/next labels arrive as HTML entities from Laravel (`&laquo; Previous`),
 * so they are replaced with plain arrows rather than rendered as markup.
 */
export function Pagination({
  links,
  className = "",
}: {
  links: PaginatorLink[];
  className?: string;
}) {
  // A single-page result still yields three links (Previous, 1, Next); there is
  // nothing to page through, so the control is hidden entirely.
  if (links.length <= 3) return null;

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-center gap-1 ${className}`}
    >
      {links.map((link, index) => {
        const label = link.label
          .replace(/&laquo;|&lsaquo;/g, "‹")
          .replace(/&raquo;|&rsaquo;/g, "›");

        const base =
          "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm transition";

        if (!link.url) {
          return (
            <span
              key={index}
              aria-disabled="true"
              className={`${base} border-line text-muted-foreground/50`}
            >
              {label}
            </span>
          );
        }

        return (
          <Link
            key={index}
            href={link.url}
            aria-current={link.active ? "page" : undefined}
            className={
              link.active
                ? `${base} border-brand bg-brand text-white`
                : `${base} border-line bg-card hover:bg-surface`
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
