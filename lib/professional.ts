import "server-only";

import { apiFetch } from "./api";
import type {
  AvailabilityDay,
  AvailabilityException,
  Collection,
  Item,
  Offering,
  PortfolioItem,
  ProfessionalDashboard,
  ProfessionalDocument,
  ProfessionalProfile,
} from "./types";

/*
 * Typed readers for a professional's own workspace.
 *
 * Every call carries the session token, so `apiFetch` refuses to cache any of
 * them — these responses are per-account and would otherwise be served to the
 * next signed-in professional to hit the same URL.
 *
 * The whole section reads from `/professional/*`, which resolves the profile
 * from the authenticated account rather than from an id in the path. There is
 * no profile id in any of these URLs to tamper with, which is why none of these
 * readers takes one.
 */

/** The signed-in professional's profile, or null before they have set one up. */
export async function getMyProfile(token: string): Promise<ProfessionalProfile | null> {
  const { data } = await apiFetch<Item<ProfessionalProfile | null>>("/professional/profile", {
    token,
  });

  return data;
}

/** The figures behind the dashboard tiles. */
export async function getDashboard(token: string): Promise<ProfessionalDashboard> {
  const { data } = await apiFetch<Item<ProfessionalDashboard>>("/professional/dashboard", {
    token,
  });

  return data;
}

export async function getOfferings(token: string): Promise<Offering[]> {
  const { data } = await apiFetch<Collection<Offering>>("/professional/services", { token });

  return data;
}

/** The weekly pattern and the dates blocked out of it, which travel together. */
export async function getAvailability(
  token: string,
): Promise<{ days: AvailabilityDay[]; exceptions: AvailabilityException[] }> {
  const { data } = await apiFetch<Item<{ days: AvailabilityDay[]; exceptions: AvailabilityException[] }>>(
    "/professional/availability",
    { token },
  );

  return data;
}

export async function getPortfolio(token: string): Promise<PortfolioItem[]> {
  const { data } = await apiFetch<Collection<PortfolioItem>>("/professional/portfolio", {
    token,
  });

  return data;
}

export async function getDocuments(token: string): Promise<ProfessionalDocument[]> {
  const { data } = await apiFetch<Collection<ProfessionalDocument>>("/professional/documents", {
    token,
  });

  return data;
}
