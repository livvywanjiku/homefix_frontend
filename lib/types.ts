/*
 * The API's response shapes.
 *
 * Mirrors the Laravel API Resources one-for-one. Dates are ISO-8601 strings
 * (Laravel's `toIso8601String()`), and every nullable column is `| null` —
 * the API is explicit about absence rather than omitting keys.
 */

/** A non-paginated Laravel resource collection: `{ data: [...] }`. */
export type Collection<T> = { data: T[] };

/** A paginated Laravel resource collection, including its link set. */
export type Paginated<T> = {
  data: T[];
  links: { url: string | null; label: string; active: boolean }[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

/** A single Laravel resource: `{ data: {...} }`. */
export type Item<T> = { data: T };

export type ServiceCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  services?: Service[];
  services_count?: number;
  created_at: string | null;
};

export type Service = {
  id: number;
  service_category_id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  category?: ServiceCategory;
  created_at: string | null;
};

export type Location = {
  id: number;
  name: string;
  region: string | null;
  label: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string | null;
};

/** The signed-in user, as returned by `/auth/me`. */
export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  role: string | null;
  email_verified_at: string | null;
  created_at: string | null;
};
