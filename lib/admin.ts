/**
 * The administration console: its permission vocabulary, its navigation, and
 * the shapes of the payloads its endpoints return.
 *
 * Everything here mirrors Laravel. The permission names are the ones in
 * `App\Enums\Permission`, and the navigation is declared once and filtered by
 * the signed-in administrator's own grants — never by their role name. That
 * distinction is the point of the whole console: a permission revoked in the
 * database takes a menu item away on the next request, and a role that happens
 * to be called "admin" grants nothing by itself.
 */

import type { Role } from "./roles";

/* ── Permissions ───────────────────────────────────────────────────────── */

/**
 * The permission vocabulary, mirroring `App\Enums\Permission`.
 *
 * Held as a closed list so a navigation entry gated on a misspelled permission
 * fails to compile rather than silently disappearing from every sidebar.
 */
export const ADMIN_PERMISSIONS = [
  "view_dashboard",
  "view_users",
  "manage_users",
  "suspend_users",
  "view_professionals",
  "manage_professionals",
  "verify_professional",
  "view_service_requests",
  "view_services",
  "view_categories",
  "manage_service_catalogue",
  "view_bookings",
  "manage_bookings",
  "view_payments",
  "manage_payments",
  "view_reviews",
  "moderate_reviews",
  "view_complaints",
  "manage_complaints",
  "view_locations",
  "manage_locations",
  "view_availability",
  "view_favorites",
  "view_notifications",
  "view_analytics",
  "view_reports",
  "export_reports",
  "manage_administrators",
  "manage_roles",
  "manage_permissions",
  "view_audit_logs",
  "manage_settings",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export function isAdminPermission(value: unknown): value is AdminPermission {
  return (
    typeof value === "string" && (ADMIN_PERMISSIONS as readonly string[]).includes(value)
  );
}

/**
 * Whether a grant list satisfies a requirement.
 *
 * `manage_*` implies its `view_*` counterpart, because the backend does the same
 * thing: an administrator who may edit the catalogue can plainly read it, and a
 * sidebar that hid "Services" from them while the API answered would be lying.
 */
const IMPLIED: Partial<Record<AdminPermission, AdminPermission>> = {
  manage_users: "view_users",
  manage_professionals: "view_professionals",
  manage_service_catalogue: "view_categories",
  manage_bookings: "view_bookings",
  manage_payments: "view_payments",
  moderate_reviews: "view_reviews",
  manage_complaints: "view_complaints",
  manage_locations: "view_locations",
};

export function can(granted: readonly string[], required: AdminPermission): boolean {
  if (granted.includes(required)) return true;

  const held = (Object.keys(IMPLIED) as AdminPermission[]).find(
    (candidate) => IMPLIED[candidate] === required && granted.includes(candidate),
  );

  return held !== undefined;
}

/* ── Navigation ────────────────────────────────────────────────────────── */

export type AdminIconName =
  | "grid"
  | "users"
  | "hardHat"
  | "clipboard"
  | "calendar"
  | "wrench"
  | "layers"
  | "card"
  | "star"
  | "flag"
  | "shieldCheck"
  | "mapPin"
  | "clock"
  | "heart"
  | "bell"
  | "chart"
  | "document"
  | "userCog"
  | "key"
  | "history"
  | "sliders";

export type AdminNavItem = {
  key: string;
  label: string;
  href: string;
  permission: AdminPermission;
  icon: AdminIconName;
};

export type AdminNavGroup = {
  key: string;
  label: string;
  items: AdminNavItem[];
};

/*
 * The sidebar, declared once.
 *
 * `permission` is the same capability the Laravel route behind the page
 * requires, so the menu and the API cannot disagree about who may look at
 * something. The group order is the order an administrator normally works in:
 * the day-to-day queue first, the things they configure less often below it.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: "main",
    label: "Main",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin/dashboard", permission: "view_dashboard", icon: "grid" },
      { key: "users", label: "Users", href: "/admin/users", permission: "view_users", icon: "users" },
      { key: "professionals", label: "Professionals", href: "/admin/professionals", permission: "view_professionals", icon: "hardHat" },
      { key: "service-requests", label: "Service Requests", href: "/admin/service-requests", permission: "view_service_requests", icon: "clipboard" },
      { key: "bookings", label: "Bookings", href: "/admin/bookings", permission: "view_bookings", icon: "calendar" },
      { key: "services", label: "Services", href: "/admin/services", permission: "view_services", icon: "wrench" },
      { key: "categories", label: "Categories", href: "/admin/categories", permission: "view_categories", icon: "layers" },
      { key: "payments", label: "Payments", href: "/admin/payments", permission: "view_payments", icon: "card" },
      { key: "reviews", label: "Reviews", href: "/admin/reviews", permission: "view_reviews", icon: "star" },
      { key: "complaints", label: "Complaints", href: "/admin/complaints", permission: "view_complaints", icon: "flag" },
    ],
  },
  {
    key: "management",
    label: "Management",
    items: [
      { key: "verification", label: "Professional Verification", href: "/admin/verification", permission: "verify_professional", icon: "shieldCheck" },
      { key: "locations", label: "Locations", href: "/admin/locations", permission: "view_locations", icon: "mapPin" },
      { key: "availability", label: "Availability", href: "/admin/availability", permission: "view_availability", icon: "clock" },
      { key: "favorites", label: "Favorites", href: "/admin/favorites", permission: "view_favorites", icon: "heart" },
      { key: "notifications", label: "Notifications", href: "/admin/notifications", permission: "view_notifications", icon: "bell" },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    items: [
      { key: "analytics", label: "Analytics", href: "/admin/analytics", permission: "view_analytics", icon: "chart" },
      { key: "reports", label: "Reports", href: "/admin/reports", permission: "view_reports", icon: "document" },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { key: "administrators", label: "Administrators", href: "/admin/administrators", permission: "manage_administrators", icon: "userCog" },
      { key: "roles", label: "Roles & Permissions", href: "/admin/roles", permission: "manage_permissions", icon: "key" },
      { key: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs", permission: "view_audit_logs", icon: "history" },
      { key: "settings", label: "System Settings", href: "/admin/settings", permission: "manage_settings", icon: "sliders" },
    ],
  },
];

/** The groups and items this administrator may actually open. */
export function visibleNav(granted: readonly string[]): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(granted, item.permission)),
  })).filter((group) => group.items.length > 0);
}

/** Every item in the console, flattened — used to resolve titles and crumbs. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items);

/**
 * The navigation entry a path belongs to, longest prefix first.
 *
 * Longest-first because `/admin/bookings/41` must resolve to Bookings and not to
 * a shorter entry that also happens to be a prefix of it.
 */
export function navItemFor(pathname: string): AdminNavItem | null {
  const matches = ADMIN_NAV_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length);

  return matches[0] ?? null;
}

/** The role label the console shows for the signed-in administrator. */
export const ADMIN_ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  superadmin: "Super Administrator",
};

/* ── Filter vocabularies ───────────────────────────────────────────────── */

/*
 * The values the API accepts, held here so a list page's `<select>` and the
 * validation rule behind it cannot drift apart. Each list page picks the subset
 * its endpoint understands.
 */

export const ROLE_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "professional", label: "Service Professional" },
  { value: "admin", label: "Administrator" },
  { value: "superadmin", label: "Super Administrator" },
];

export const ACCOUNT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export const USER_SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "active", label: "Active first" },
];

export const BOOKING_SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "scheduled", label: "By appointment" },
  { value: "value", label: "Highest value" },
];

export const PROFESSIONAL_SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "rating", label: "Best rated" },
  { value: "jobs", label: "Most jobs" },
  { value: "name", label: "Business name (A–Z)" },
];

/*
 * Booking and service-request statuses.
 *
 * The labels are the ones `App\Enums\BookingStatus::label()` and
 * `ServiceRequestStatus::label()` return, copied rather than translated: the
 * console shows the API's wording everywhere else, and a filter that offered
 * "Price sent" while the row beside it read "Quoted" would look like two
 * different things.
 */
export const BOOKING_STATUS_OPTIONS = [
  { value: "pending", label: "Awaiting response" },
  { value: "quoted", label: "Price sent" },
  { value: "accepted", label: "Accepted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "on_the_way", label: "On the way" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "disputed", label: "Disputed" },
];

export const SERVICE_REQUEST_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "quoted", label: "Quotes received" },
  { value: "awarded", label: "Awarded" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

export const SERVICE_REQUEST_SORT_OPTIONS = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "quotes", label: "Most quotations" },
  { value: "budget", label: "Highest budget" },
];

export const VERIFICATION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

export const PAGE_SIZES = [25, 50, 100];

/*
 * The administrative acts the audit trail can be filtered by.
 *
 * Copied from `App\Enums\AdminAction` with the enum's own labelling rule
 * (`ucfirst` over the value with underscores turned into spaces), because the
 * log endpoint validates the filter against that enum and offers no list of its
 * own — a filter dropdown populated any other way would be guessing at what the
 * API accepts.
 */
export const AUDIT_ACTION_OPTIONS = [
  "login",
  "logout",
  "login_failed",
  "user_created",
  "user_updated",
  "user_suspended",
  "user_activated",
  "professional_verified",
  "professional_rejected",
  "professional_suspended",
  "professional_activated",
  "service_created",
  "service_updated",
  "service_deleted",
  "category_created",
  "category_updated",
  "category_deleted",
  "booking_updated",
  "booking_cancelled",
  "payment_updated",
  "refund_issued",
  "review_moderated",
  "complaint_resolved",
  "administrator_created",
  "administrator_updated",
  "administrator_suspended",
  "role_updated",
  "permissions_updated",
  "setting_updated",
].map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " "),
}));

export function adminRoleLabel(roles: readonly Role[]): string {
  const privileged = roles.find((role) => role === "superadmin") ?? roles[0];

  return privileged ? (ADMIN_ROLE_LABEL[privileged] ?? "Administrator") : "Administrator";
}

/* ── Payloads ──────────────────────────────────────────────────────────── */

/** The window every dashboard figure describes. */
export type AdminRange = {
  preset: string;
  from: string;
  to: string;
  granularity: "day" | "week" | "month" | string;
  days: number;
};

export const RANGE_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  this_year: "This year",
  custom: "Custom",
};

/**
 * The quick date filters, in the order they are offered.
 *
 * "Custom" is absent because it is not a preset: it is the two date fields
 * beside the chips, and offering a chip that only means "fill in the form" would
 * be a control that does nothing on its own.
 */
export const QUICK_RANGES = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "this_year",
] as const;

/**
 * Builds a console URL, carrying only the filters that are actually set.
 *
 * A blank filter is dropped rather than serialised as `q=`, so clearing a field
 * returns the reader to the unfiltered URL instead of a URL that looks filtered
 * and is not.
 */
export function consoleHref(base: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();

  return query ? `${base}?${query}` : base;
}

/**
 * Trims a timestamp down to what an `<input type="date">` accepts.
 *
 * The API reports its window as a full ISO timestamp; the date control wants
 * `YYYY-MM-DD` and silently discards a value it cannot parse.
 */
export function asDateInput(value: string): string {
  return value.slice(0, 10);
}

/**
 * One statistic card.
 *
 * `available: false` with a null value is a real state, not an empty one: it is
 * how the API says the feature behind the figure has not shipped. The card
 * renders that rather than a zero, which would read as a fact.
 */
export type StatCard = {
  key: string;
  label: string;
  value: number | null;
  previous: number | null;
  change: number | null;
  change_percent: number | null;
  trend: "up" | "down" | "flat";
  inverse: boolean;
  format: "number" | "money";
  available: boolean;
};

export type ActivityEvent = {
  type: string;
  title: string;
  description: string;
  at: string;
  href: string | null;
  tone: "neutral" | "success" | "accent" | "danger" | string;
};

export type PendingAction = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: string;
  action: string;
};

export type HealthStatus = "operational" | "degraded" | "down" | "not_configured";

export type HealthLine = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
};

export type Availability = {
  payments: boolean;
  reviews: boolean;
  complaints: boolean;
  messaging: boolean;
  bookings: boolean;
  quotations: boolean;
  notifications: boolean;
};

export type DashboardPayload = {
  range: AdminRange;
  presets: string[];
  stats: StatCard[];
  activity: ActivityEvent[];
  pending_actions: PendingAction[];
  system_health: HealthLine[];
  system_health_overall: HealthStatus;
  availability: Availability;
};

/** A point on any trend series. Buckets come from the server, zeros included. */
export type SeriesPoint = { label: string; value: number };

/** A point split by a key — used for bookings by status, signups by role. */
export type SplitSeriesPoint = { label: string; values: Record<string, number> };

/**
 * The console's chart palette.
 *
 * Drawn from the corporate set rather than invented: teal, navy and ink carry
 * the first three series, and anything beyond that steps down through greys so a
 * fourth category reads as "other" rather than competing for attention.
 */
export const ADMIN_SERIES_COLOURS = [
  "#0f766e",
  "#1e3a5f",
  "#0f172a",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
];

export type RevenuePayload = {
  available: boolean;
  reason: string | null;
  totals: {
    all_time_cents: number;
    today_cents: number;
    week_cents: number;
    month_cents: number;
    year_cents: number;
    refunded_cents: number;
    period_cents: number;
    previous_period_cents: number;
  } | null;
  series: SeriesPoint[];
};

export type BookingAnalytics = {
  available: boolean;
  reason?: string | null;
  total: number;
  in_period: number;
  previous_period: number;
  statuses: { value: string; label: string; total: number; in_period: number }[];
  completion_rate: number | null;
  cancellation_rate: number | null;
  series: SeriesPoint[];
  status_series: SplitSeriesPoint[];
};

export type UserAnalytics = {
  available: boolean;
  roles: { customers: number; professionals: number; administrators: number };
  statuses: { active: number; suspended: number };
  new_in_period: number;
  new_previous_period: number;
  series: SeriesPoint[];
  series_by_role: SplitSeriesPoint[];
  registrations_by_location: { name: string; total: number }[];
};

export type ProfessionalAnalytics = {
  available: boolean;
  reason?: string | null;
  verification: { value: string; label: string; total: number }[];
  listed: number;
  series: SeriesPoint[];
  top_rated: ProfessionalRankRow[];
  most_completed: ProfessionalRankRow[];
  awaiting_review: number;
};

export type ProfessionalRankRow = {
  id: number;
  business_name: string | null;
  name: string;
  location: string | null;
  rating_avg: number;
  rating_count: number;
  completed_jobs_count: number;
};

export type ServiceAnalytics = {
  available: boolean;
  reason?: string | null;
  catalogue: { services: number; active_services: number; categories: number };
  most_requested: { id: number; name: string; total: number }[];
  most_requested_categories: { id: number; name: string; total: number }[];
  average_budget_cents: number | null;
  highest_revenue: { id: number; name: string; total: number } | null;
  revenue_available: boolean;
};

export type LocationAnalytics = {
  available: boolean;
  reason?: string | null;
  demand: {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    requests: number;
    professionals: number;
  }[];
  total_covered: number;
};

/* ── Console rows ──────────────────────────────────────────────────────── */

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: "active" | "suspended" | string;
  role: string | null;
  email_verified_at: string | null;
  created_at: string | null;
  /** Present only on the signed-in administrator's own row. */
  roles?: string[];
  permissions?: string[];
};

/**
 * One line of a booking's state history.
 *
 * Not on `Booking` itself: the history is served alongside a single booking by
 * its own endpoint rather than travelling with every row of the list, because
 * a paginated list of twenty-five bookings does not need twenty-five histories.
 */
export type AdminBookingHistoryEntry = {
  id: number;
  from: string | null;
  from_label: string | null;
  to: string;
  to_label: string;
  note: string | null;
  changed_by: string | null;
  at: string | null;
};

export type AdminLogRow = {
  id: number;
  action: string;
  action_label: string;
  tone: string;
  description: string | null;
  subject: { type: string; id: number | null } | null;
  actor: { id: number; name: string } | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

export type AdminRoleRow = {
  id: number;
  name: string;
  label: string;
  permissions: string[];
  users_count: number;
  permissions_count: number;
  is_editable: boolean;
  is_customised: boolean;
};

/**
 * One entry in the permission matrix.
 *
 * `value` is a plain string rather than {@see AdminPermission}: the roles screen
 * offers *every* permission in `App\Enums\Permission`, which includes the
 * marketplace capabilities customers and professionals hold
 * (`create_booking`, `create_quotation`, …) and not only the administrative
 * ones. Narrowing it to the console's own vocabulary would have been a type that
 * lies about what the API sends.
 */
export type AdminPermissionOption = {
  value: string;
  label: string;
  reserved: boolean;
};

export type AdminSetting = {
  key: string;
  value: string | number | boolean | unknown[] | null;
  type: "string" | "integer" | "boolean" | "json" | string;
  group: string;
  label: string | null;
  description: string | null;
  is_public: boolean;
  updated_at: string | null;
};

export type AdminSettingGroup = {
  group: string;
  label: string;
  settings: AdminSetting[];
};

export type AdminReportDefinition = {
  key: string;
  label: string;
  description: string;
  filters: string[];
  available: boolean;
};

/**
 * The reporting screen's menu.
 *
 * `ranges` is the API's own preset list rather than a copy held here, so a
 * preset added to `DateRange` appears in the console without an edit — and a
 * preset removed from it cannot linger as a filter that silently does nothing.
 */
export type AdminReportList = {
  reports: AdminReportDefinition[];
  formats: string[];
  ranges: string[];
};

export type AdminReportPreview = {
  report: string;
  label: string;
  range: AdminRange;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
  truncated: boolean;
  preview_limit: number;
};

/* ── Formatting helpers shared by the console ──────────────────────────── */

/**
 * The class name of an audited subject, as a reader would say it.
 *
 * The API sends the fully-qualified model class because that is what it stores;
 * `App\Models\ProfessionalProfile` is not what an administrator calls it. Lives
 * here rather than beside one of the two audit screens because a page module may
 * only export the page.
 */
export function auditSubjectLabel(type: string): string {
  const name = type.split("\\").pop() ?? type;

  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

/**
 * An audit action's tone, mapped onto the pill the console can actually render.
 *
 * `App\Enums\AdminAction::tone()` returns the vocabulary the trail is grouped
 * by; the pills know a smaller set, so anything unrecognised reads as neutral
 * rather than throwing in the middle of a table.
 */
export function auditPillTone(tone: string): "neutral" | "success" | "warning" | "danger" | "accent" {
  switch (tone) {
    case "success":
      return "success";
    case "danger":
      return "danger";
    case "accent":
      return "accent";
    default:
      return "neutral";
  }
}

/**
 * The trend of a card, in the direction it should be *read*.
 *
 * A rise in cancellations is bad news, so `inverse` cards are painted the other
 * way round — otherwise a dashboard that turns more red as things get worse
 * would show a cheerful green arrow on the way down.
 */
export function trendTone(card: StatCard): "positive" | "negative" | "flat" | "unknown" {
  if (!card.available || card.trend === "flat") return card.available ? "flat" : "unknown";

  const good = card.trend === "up" ? !card.inverse : card.inverse;

  return good ? "positive" : "negative";
}

/** A percentage change, or the honest "no comparison" when there is no base. */
export function formatChange(card: StatCard): string {
  if (card.change_percent === null) return "—";
  const rounded = Math.round(card.change_percent * 10) / 10;

  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}
