import "server-only";

import { apiFetch } from "./api";
import type { Collection, Item, Location, Service, ServiceCategory } from "./types";

/*
 * Typed readers for the public catalogue.
 *
 * These are unauthenticated, so they are the one place caching is safe: the
 * response is identical for every visitor, and `apiFetch` refuses to cache
 * anything carrying a token (see its note on the Authorization header not
 * being part of Next's cache key).
 *
 * They are deliberately uncached for now. The catalogue only changes through
 * the admin console, which does not exist yet, so a stale cache would be a
 * debugging trap with no upside — caching plus `revalidateTag` is a Phase 9
 * concern once there are writes to invalidate on.
 */

/** Every active service category, in display order, with a service count. */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data } = await apiFetch<Collection<ServiceCategory>>("/service-categories");

  return data;
}

/** One category with its bookable services. Returns null when the slug is unknown. */
export async function getServiceCategory(slug: string): Promise<ServiceCategory | null> {
  try {
    const { data } = await apiFetch<Item<ServiceCategory>>(
      `/service-categories/${encodeURIComponent(slug)}`,
    );

    return data;
  } catch {
    // A missing category is an ordinary outcome of a stale link, not an error
    // worth a 500 — the page renders its own not-found instead.
    return null;
  }
}

/** Every bookable service, optionally narrowed by category slug or search term. */
export async function getServices(
  filters: { category?: string; q?: string } = {},
): Promise<Service[]> {
  const { data } = await apiFetch<Collection<Service>>("/services", {
    search: { category: filters.category, q: filters.q },
  });

  return data;
}

/** Every active location, for the pickers on the landing page and search. */
export async function getLocations(q?: string): Promise<Location[]> {
  const { data } = await apiFetch<Collection<Location>>("/locations", {
    search: { q },
  });

  return data;
}
