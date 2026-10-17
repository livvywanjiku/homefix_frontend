import "server-only";

import { apiFetch, type QueryValue } from "./api";
import type { Item, Paginated, Quotation } from "./types";

/*
 * Quotations, from both sides of the market.
 *
 * Two functions per side rather than one parameterised function, because the
 * paths differ: a customer reaches offers through a job they own, a
 * professional through their own account. Neither takes an account id — Laravel
 * resolves the caller from the session token and scopes the query to them, so
 * there is nothing here for a client to point at somebody else's rows.
 *
 * Every call carries the token, so `apiFetch` refuses to cache any of it.
 */

export type QuotationListFilters = {
  status?: QueryValue;
  service_request_id?: QueryValue;
  q?: QueryValue;
  sort?: QueryValue;
  page?: QueryValue;
  per_page?: QueryValue;
};

/** The offers on a job the customer posted, strongest first. */
export async function getQuotationsForRequest(
  token: string,
  serviceRequestId: number | string,
  filters: QuotationListFilters = {},
): Promise<Paginated<Quotation>> {
  return apiFetch<Paginated<Quotation>>(
    `/service-requests/${encodeURIComponent(String(serviceRequestId))}/quotations`,
    { token, search: { per_page: 50, ...filters } },
  );
}

/** Every offer this professional has made, across all jobs. */
export async function getMyQuotations(
  token: string,
  filters: QuotationListFilters = {},
): Promise<Paginated<Quotation>> {
  return apiFetch<Paginated<Quotation>>("/professional/quotations", { token, search: filters });
}

/**
 * This professional's own offer on one job, when they have made one.
 *
 * The board's job detail does not include it, so the page asks for it
 * separately; the unique `(service_request_id, professional_id)` index means
 * taking the first row is unambiguous.
 */
export async function getMyQuotationForRequest(
  token: string,
  serviceRequestId: number | string,
): Promise<Quotation | null> {
  const page = await getMyQuotations(token, {
    service_request_id: serviceRequestId,
    per_page: 1,
  });

  return page.data[0] ?? null;
}

export async function getMyQuotation(
  token: string,
  id: number | string,
): Promise<Quotation> {
  const { data } = await apiFetch<Item<Quotation>>(
    `/professional/quotations/${encodeURIComponent(String(id))}`,
    { token },
  );

  return data;
}
