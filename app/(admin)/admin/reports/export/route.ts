import { NextResponse, type NextRequest } from "next/server";
import { can, type AdminPermission } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { laravelUrl } from "@/lib/api";

/**
 * The way out of the building for a report.
 *
 * A dedicated route handler rather than a link through `/api/laravel/[...path]`
 * for two reasons. The proxy forwards only the content type, so a download
 * arriving through it would lose its filename and land in the browser as an
 * untitled stream. And the CSV is the one response in the console that can be
 * arbitrarily large, so it is streamed here — the body is piped straight from
 * Laravel to the browser without ever being assembled in memory.
 *
 * The gates mirror Laravel's own: `export_reports` for the CSV, which carries
 * the entire dataset out of the building, and `view_reports` for the print view,
 * which is the bounded one. Laravel enforces both again on its side — this check
 * exists so the console answers with a sentence instead of a 403 page.
 */

/** The reports the API will run. Anything else is never forwarded. */
const REPORTS = new Set(["bookings", "service_requests", "users", "professionals"]);

/** The filters the report endpoints understand. Anything else is dropped. */
const FILTERS = ["range", "from", "to", "status", "role", "service_id", "location_id"];

export async function GET(request: NextRequest) {
  const { session, account } = await currentAdmin();
  const params = request.nextUrl.searchParams;

  const report = params.get("report");

  if (!report || !REPORTS.has(report)) {
    return NextResponse.json({ message: "Unknown report." }, { status: 404 });
  }

  const format = params.get("format") === "print" ? "print" : "csv";
  const required: AdminPermission = format === "csv" ? "export_reports" : "view_reports";

  if (!can(account.permissions, required)) {
    return NextResponse.json(
      { message: `Your account does not hold the ${required} permission.` },
      { status: 403 },
    );
  }

  const query = new URLSearchParams();

  for (const key of FILTERS) {
    const value = params.get(key);

    if (value) query.set(key, value);
  }

  query.set("format", format);

  let response: Response;

  try {
    response = await fetch(laravelUrl(`admin/reports/${report}/export`, query), {
      headers: {
        accept: "*/*",
        authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { message: "Cannot reach the HomeFix service right now." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    // The API's own refusal is passed on rather than replaced: "that report is
    // not available yet" is more use to the reader than a generic failure.
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  }

  const headers = new Headers();

  const contentType = response.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  // Without this the CSV arrives with no name. Laravel sets it; copying it here
  // is what makes the download land as `bookings-2026-01-01.csv`.
  const disposition = response.headers.get("content-disposition");
  if (disposition) headers.set("content-disposition", disposition);

  // A report is per-request and per-administrator; nothing about it may be
  // cached by a shared proxy on the way back.
  headers.set("cache-control", "private, no-store");

  return new NextResponse(response.body, { status: 200, headers });
}
