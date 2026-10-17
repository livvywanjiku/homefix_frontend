/*
 * The API's response shapes.
 *
 * Mirrors the Laravel API Resources one-for-one. Dates are ISO-8601 strings
 * (Laravel's `toIso8601String()`), and every nullable column is `| null` —
 * the API is explicit about absence rather than omitting keys.
 */

/** A non-paginated Laravel resource collection: `{ data: [...] }`. */
export type Collection<T> = { data: T[] };

/**
 * A paginated Laravel resource collection.
 *
 * `Resource::collection($paginator)` is not the raw paginator, and the two
 * disagree about the name `links`. The top-level `links` here is the
 * first/last/prev/next summary — an object — while the `{url, label, active}`
 * set a pager renders is `meta.links`. Both are declared so the distinction is
 * visible at the call site rather than discovered at runtime.
 */
export type Paginated<T> = {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    path: string;
    links: { url: string | null; label: string; active: boolean }[];
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
  /** Present only where the caller asked for the count — the admin catalogue. */
  professional_services_count?: number;
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

/*
 * Professional profiles.
 *
 * `verification_status` and `pricing_type` mirror the Laravel backed enums
 * (`App\Enums\VerificationStatus`, `PricingType`). The `*_label` companions are
 * rendered instead of being derived here, so the wording lives in one place —
 * the server — and a status renamed there does not need a frontend release.
 */

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";
export type PricingType = "fixed" | "hourly" | "quote";
export type DocumentType =
  | "national_id"
  | "certificate"
  | "license"
  | "insurance"
  | "other";

/** A user as embedded in a public professional profile — never the email. */
export type PublicUser = {
  id: number;
  name: string;
  avatar_url: string | null;
  /** Administrators only; absent from customer-facing responses. */
  email?: string;
  phone?: string | null;
};

/** One entry of the weekly working pattern. `day_of_week` is 0 = Sunday. */
export type AvailabilityDay = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type AvailabilityException = {
  id: number;
  blocked_on: string;
  reason: string | null;
};

/** A catalogue service as offered by one professional, with its own pricing. */
export type Offering = {
  id: number;
  service_id: number;
  description: string | null;
  pricing_type: PricingType;
  pricing_label: string;
  price_min_cents: number | null;
  price_max_cents: number | null;
  is_active: boolean;
  service?: Service;
  created_at: string | null;
};

export type PortfolioImage = {
  id: number;
  path: string;
  url: string | null;
  caption: string | null;
  is_cover: boolean;
  sort_order: number;
};

export type PortfolioItem = {
  id: number;
  title: string;
  description: string | null;
  completed_on: string | null;
  sort_order: number;
  is_published: boolean;
  service: Service | null;
  location: Location | null;
  images: PortfolioImage[];
  cover_url: string | null;
  created_at: string | null;
};

export type ProfessionalDocument = {
  id: number;
  type: DocumentType;
  type_label: string;
  status: VerificationStatus;
  status_label: string;
  notes: string | null;
  /** Withheld from anyone who is neither the owner nor an administrator. */
  url?: string;
  reviewed_at: string | null;
  created_at: string | null;
};

/**
 * A professional profile.
 *
 * Optional keys are genuinely conditional in the resource: `phone`,
 * `documents` and `verification_notes` appear only to the owner or an admin,
 * and the relation-backed keys only when the query eager-loaded them.
 */
export type ProfessionalProfile = {
  id: number;
  user_id: number;
  business_name: string;
  about: string | null;
  experience_years: number | null;
  verification_status: VerificationStatus;
  verification_label: string;
  is_verified: boolean;
  verified_at: string | null;
  verification_notes?: string | null;
  rating_avg: number;
  rating_count: number;
  completed_jobs_count: number;
  phone?: string | null;
  user?: PublicUser;
  base_location: Location | null;
  service_areas: Location[];
  services: Offering[];
  availabilities: AvailabilityDay[];
  availability_exceptions: AvailabilityException[];
  portfolio_items: PortfolioItem[];
  services_count?: number;
  documents_count?: number;
  from_price_cents?: number | null;
  documents?: ProfessionalDocument[];
  created_at: string | null;
};

/** The figures behind the `/pro` dashboard tiles. */
export type ProfessionalDashboard = {
  verification_status: VerificationStatus;
  verification_label: string;
  is_verified: boolean;
  is_listed: boolean;
  verification_notes: string | null;
  rating_avg: number;
  rating_count: number;
  completed_jobs_count: number;
  active_services_count: number;
  service_areas_count: number;
  portfolio_items_count: number;
  documents_count: number;
  pending_documents_count: number;
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

/*
 * Professional discovery.
 *
 * A search result card is deliberately a different shape from
 * `ProfessionalProfile`: it carries a teaser rather than the full text, three
 * service names rather than the whole list, and only the id and name of each
 * service area. The server decides which of these keys are present — `distance_km`
 * is absent, not null, when no location was searched from.
 */
export type ProfessionalCard = {
  id: number;
  business_name: string;
  about_excerpt: string | null;
  experience_years: number | null;
  verification_status: VerificationStatus;
  verification_label: string;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  completed_jobs_count: number;
  user?: PublicUser;
  base_location: Location | null;
  service_areas: { id: number; name: string }[];
  from_price_cents?: number | null;
  services_count?: number;
  top_services?: { id: number; name: string }[];
  distance_km?: number | null;
  created_at: string | null;
};

/*
 * Service requests.
 *
 * `address`, `instructions`, `latitude` and `longitude` are withheld from the
 * open board — a professional sees the town and the job, not where the customer
 * lives, until they have quoted. They are present for the owner.
 */
export type ServiceRequestStatus =
  | "open"
  | "quoted"
  | "awarded"
  | "closed"
  | "cancelled"
  | "expired";

export type ServiceRequestUrgency = "flexible" | "soon" | "urgent";
export type PreferredTimeSlot = "morning" | "afternoon" | "evening";

export type ServiceRequestImage = {
  id: number;
  path: string;
  url: string;
  original_name: string | null;
  size_bytes: number | null;
  sort_order: number;
};

export type ServiceRequest = {
  id: number;
  /** The handle a customer reads out on the phone: "REQ-482913". */
  reference: string;
  title: string;
  description: string;
  status: ServiceRequestStatus;
  status_label: string;
  urgency: ServiceRequestUrgency;
  urgency_label: string;

  /*
   * State the client cannot derive. `status` can still read "open" in the moment
   * before the expiry sweep runs, so the deadline is evaluated on the server and
   * the resulting capabilities travel with the row.
   */
  is_expired: boolean;
  accepts_quotations: boolean;
  is_editable: boolean;
  is_cancellable: boolean;

  preferred_date: string | null;
  preferred_time_slot: PreferredTimeSlot | null;
  preferred_time_slot_label: string | null;
  budget_min_cents: number | null;
  budget_max_cents: number | null;
  quotes_count: number;
  expires_at: string | null;

  address?: string | null;
  instructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  service?: Service;
  location?: Location;
  images?: ServiceRequestImage[];
  customer?: { id: number; name: string; avatar_url: string | null };

  /*
   * The offers this job attracted. Loaded only by the administrator's view of a
   * single posting — the open board deliberately does not load them, so a
   * professional browsing for work never sees what a competitor bid.
   */
  quotations?: Quotation[];

  /** Present on board rows when a location was searched from. */
  distance_km?: number | null;

  created_at: string | null;
  updated_at: string | null;
};

/** The public profile page's payload, with the viewer's own capability. */
export type PublicProfessionalPage = {
  profile: ProfessionalProfile;
  /** Whether this viewer may post a service request — false for a guest. */
  canRequestService: boolean;
};

/*
 * Quotations.
 *
 * A price offered by a professional on a customer's job. The four category
 * totals and the grand total are the server's sums of `items` — they are sent
 * alongside the lines so a table can sort and total without walking every
 * breakdown, but they are never assembled here.
 *
 * The `can_be_*` flags are answered by Laravel's policy for *this* viewer. The
 * same row is actionable by one party and read-only to the other, so they are
 * rendered rather than re-derived from `status`.
 */
export type QuotationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export type QuotationItemCategory = "labour" | "materials" | "transport" | "other";

export type QuotationItem = {
  id: number;
  category: QuotationItemCategory;
  category_label: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};

/** Who is offering — the business and its record, not the account. */
export type QuotationProfessional = {
  id: number;
  name: string;
  avatar_url: string | null;
  business_name: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  completed_jobs_count: number | null;
};

export type Quotation = {
  id: number;
  reference: string;
  status: QuotationStatus;
  status_label: string;

  /* Evaluated on the server: the job can close without this row changing. */
  is_live: boolean;
  has_expired: boolean;
  is_acceptable: boolean;

  can_be_accepted: boolean;
  can_be_rejected: boolean;
  can_be_edited: boolean;
  can_be_withdrawn: boolean;

  message: string | null;
  estimated_days: number | null;
  available_from: string | null;
  valid_until: string | null;

  labour_cents: number;
  materials_cents: number;
  transport_cents: number;
  other_cents: number;
  total_cents: number;

  items: QuotationItem[];

  professional?: QuotationProfessional;

  /**
   * The counterparty's number, present only once this quote has been accepted
   * and only for the two parties. Null while the job is still being priced.
   */
  contact: { name: string; phone: string } | null;

  /** The job this price is for; present on the professional's own list. */
  service_request?: {
    id: number;
    reference: string;
    title: string;
    status: ServiceRequestStatus;
    status_label: string;
  };

  /** Present once the offer has been taken. */
  booking?: Booking | null;

  decided_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/*
 * Bookings.
 *
 * `allowed_transitions` is the server's state machine, sent rather than
 * reconstructed here — the controls a booking screen shows are exactly the moves
 * the server would permit.
 */
export type BookingStatus =
  | "pending"
  | "quoted"
  | "accepted"
  | "scheduled"
  | "on_the_way"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export type Booking = {
  id: number;
  reference: string;
  status: BookingStatus;
  status_label: string;

  allowed_transitions: { value: BookingStatus; label: string }[];
  is_active: boolean;
  is_finished: boolean;
  is_reviewable: boolean;

  title: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;

  scheduled_for: string | null;
  scheduled_time_slot: PreferredTimeSlot | null;
  scheduled_time_slot_label: string | null;

  labour_cents: number;
  materials_cents: number;
  transport_cents: number;
  other_cents: number;
  total_cents: number;

  agreed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;

  service?: Service;
  location?: Location;
  customer?: { id: number; name: string; avatar_url: string | null };
  professional?: {
    id: number;
    name: string;
    avatar_url: string | null;
    business_name: string | null;
  };

  created_at: string | null;
  updated_at: string | null;
};
