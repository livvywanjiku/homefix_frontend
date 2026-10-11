import "server-only";

import { apiFetch, type QueryValue } from "./api";
import type { Paginated, ProfessionalCard, PublicProfessionalPage } from "./types";

/*
 * Public professional discovery.
 *
 * Unauthenticated, like the catalogue readers — a visitor can search and open a
 * profile before creating an account. Every filter is passed to Laravel rather
 * than applied here, which is what keeps the browser from having to download
 * every professional in order to hide most of them.
 *
 * Uncached, for the same reason as the catalogue: nothing invalidates it yet, so
 * a stale cache would be a debugging trap with no upside.
 */

export type ProfessionalSearchFilters = {
  q?: QueryValue;
  service_id?: QueryValue;
  service_category_id?: QueryValue;
  location_id?: QueryValue;
  max_distance_km?: QueryValue;
  min_price_cents?: QueryValue;
  max_price_cents?: QueryValue;
  min_rating?: QueryValue;

  /** A day the customer wants somebody to turn up on, `YYYY-MM-DD`. */
  date?: QueryValue;

  sort?: QueryValue;
  page?: QueryValue;
  per_page?: QueryValue;
};

export async function searchProfessionals(
  filters: ProfessionalSearchFilters = {},
): Promise<Paginated<ProfessionalCard>> {
  return apiFetch<Paginated<ProfessionalCard>>("/professionals", { search: filters });
}

/**
 * One public profile, or null when it is unknown or not visible.
 *
 * A profile that is not verified answers 404 rather than 403 — the directory
 * must not become a way to enumerate who has applied — so the two outcomes are
 * deliberately collapsed, and both render the page's not-found.
 *
 * The token is optional and only ever the viewer's own. It is what makes
 * `can_request_service` truthful: without it Laravel sees a guest, and a
 * professional looking at a colleague's profile would be told they can post a
 * request they are not allowed to post.
 */
export async function getPublicProfessional(
  id: number | string,
  token?: string | null,
): Promise<PublicProfessionalPage | null> {
  try {
    const body = await apiFetch<{
      data: PublicProfessionalPage["profile"];
      meta: { can_request_service: boolean };
    }>(`/professionals/${encodeURIComponent(String(id))}`, { token });

    return { profile: body.data, canRequestService: body.meta.can_request_service };
  } catch {
    return null;
  }
}
