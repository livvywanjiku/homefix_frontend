import "server-only";

import { apiFetch, type QueryValue } from "./api";
import type { Item, Paginated, ServiceRequest, ServiceRequestStatus } from "./types";

/*
 * A customer's own service requests.
 *
 * Every call here carries the session token, so the response is per-account and
 * `apiFetch` refuses to cache it. The server scopes the query to the caller —
 * there is no customer id in any of these paths, so there is nothing for a
 * client to tamper with.
 */

export type RequestListFilters = {
  status?: QueryValue;
  urgency?: QueryValue;
  service_id?: QueryValue;
  q?: QueryValue;
  sort?: QueryValue;
  page?: QueryValue;
  per_page?: QueryValue;
};

export async function getMyServiceRequests(
  token: string,
  filters: RequestListFilters = {},
): Promise<Paginated<ServiceRequest>> {
  return apiFetch<Paginated<ServiceRequest>>("/service-requests", { token, search: filters });
}

export async function getServiceRequest(
  token: string,
  id: number | string,
): Promise<ServiceRequest> {
  const { data } = await apiFetch<Item<ServiceRequest>>(
    `/service-requests/${encodeURIComponent(String(id))}`,
    { token },
  );

  return data;
}

/**
 * How many of the customer's requests are in a given state.
 *
 * Read from the paginator's `total` with a one-row page rather than by fetching
 * the rows: the dashboard needs the count, and a count is not worth a payload.
 */
export async function countServiceRequests(
  token: string,
  status: ServiceRequestStatus,
): Promise<number> {
  const { meta } = await apiFetch<Paginated<ServiceRequest>>("/service-requests", {
    token,
    search: { status, per_page: 1 },
  });

  return meta.total;
}

/** Requests that still need the customer's attention, for the dashboard. */
export async function getOpenRequestCount(token: string): Promise<number> {
  return countServiceRequests(token, "open");
}
