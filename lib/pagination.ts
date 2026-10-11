import type { Paginated } from "./types";

export type PaginatorLink = { url: string | null; label: string; active: boolean };

/**
 * Rewrites a Laravel paginator's links so they point at the page rendering them.
 *
 * The link set comes from `meta.links`, not the top-level `links`: a paginated
 * API resource uses `links` for the first/last/prev/next summary object, and
 * the array of page links the pager renders lives under `meta`.
 *
 * The paginator builds its URLs from the request it answered — the API's, not
 * the browser's — so a link's `url` arrives as
 * `http://127.0.0.1:8000/api/professionals?page=2`. Handing that to `<Link>`
 * would navigate the customer off the site entirely.
 *
 * Only the query string is kept, which is exactly what should survive: it
 * carries `page` plus whichever filters produced this result set. The host and
 * path are replaced with the route the customer is actually looking at.
 */
export function paginationLinks<T>(page: Paginated<T>, path: string): PaginatorLink[] {
  return page.meta.links.map((link) => {
    if (!link.url) return { ...link, url: null };

    // Parsed against a throwaway base so a relative URL (Laravel emits one when
    // the request host is not trusted) goes through the same path as an
    // absolute one.
    const { search } = new URL(link.url, "http://paginator.invalid");

    return { ...link, url: `${path}${search}` };
  });
}
