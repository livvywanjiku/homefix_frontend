import "server-only";

import { apiFetch, type QueryValue } from "./api";
import type { Item, Paginated, ServiceRequest } from "./types";

/*
 * The board of open jobs a professional works from.
 *
 * Read-only, and scoped by Laravel to the authenticated professional's own
 * service areas — there is no "whose board" parameter to tamper with. Calls
 * carry the session token, so `apiFetch` refuses to cache them.
 */

export type RequestBoardFilters = {
  /** `matching` (the default) narrows to their services and towns; `all` does not. */
  scope?: QueryValue;
  service_id?: QueryValue;
  service_category_id?: QueryValue;
  location_id?: QueryValue;
  urgency?: QueryValue;
  min_budget_cents?: QueryValue;
  max_distance_km?: QueryValue;
  q?: QueryValue;
  sort?: QueryValue;
  page?: QueryValue;
  per_page?: QueryValue;
};

export async function getRequestBoard(
  token: string,
  filters: RequestBoardFilters = {},
): Promise<Paginated<ServiceRequest>> {
  return apiFetch<Paginated<ServiceRequest>>("/professional/requests", {
    token,
    search: filters,
  });
}

export async function getBoardRequest(token: string, id: number | string): Promise<ServiceRequest> {
  const { data } = await apiFetch<Item<ServiceRequest>>(
    `/professional/requests/${encodeURIComponent(String(id))}`,
    { token },
  );

  return data;
}
