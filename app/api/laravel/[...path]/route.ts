import { NextResponse, type NextRequest } from "next/server";
import { laravelUrl } from "@/lib/api";
import { verifySession } from "@/lib/dal";
import { deleteSession } from "@/lib/session-cookie";

/**
 * A narrow, allow-listed transport from client components to Laravel.
 *
 * Client components cannot hold the Sanctum token, so TanStack Query calls
 * this route instead; the session cookie is attached here, server-side.
 *
 * Everything below exists to keep a catch-all route from becoming an open
 * proxy. See the notes on `isValidSegment` and `ALLOWED_PREFIXES` in
 * particular — they are the load-bearing checks.
 */

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

/** The first path segment must name a real API area. */
const ALLOWED_PREFIXES = new Set([
  "auth",
  "profile",
  "service-categories",
  "services",
  "locations",
  "professionals",
  "service-requests",
  "quotations",
  "bookings",
  "messages",
  "reviews",
  "complaints",
  "payments",
  "notifications",
  "professional",
  "admin",
]);

const SEGMENT = /^[A-Za-z0-9._-]+$/;

/**
 * Whether a single path segment is safe to append to the Laravel base URL.
 *
 * The character class alone is NOT sufficient, which is easy to get wrong:
 * `..` consists only of dots and therefore matches `SEGMENT` perfectly. A path
 * of `../../admin/users` would then resolve outside the API prefix. The
 * explicit `.`/`..` rejection is what actually closes that hole.
 */
function isValidSegment(segment: string): boolean {
  return SEGMENT.test(segment) && segment !== "." && segment !== "..";
}

function badRequest() {
  return NextResponse.json({ message: "Invalid path." }, { status: 400 });
}

async function forward(request: NextRequest, context: RouteContext<"/api/laravel/[...path]">) {
  const method = request.method.toUpperCase();

  if (!ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
  }

  const { path } = await context.params;

  if (!Array.isArray(path) || path.length === 0 || !path.every(isValidSegment)) {
    return badRequest();
  }

  if (!ALLOWED_PREFIXES.has(path[0])) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  let url: URL;

  try {
    // laravelUrl re-checks the origin and the /api prefix, so a segment that
    // somehow slipped past the checks above still cannot escape the API base.
    url = laravelUrl(path.join("/"), request.nextUrl.searchParams);
  } catch {
    return badRequest();
  }

  // Only these two headers travel upstream. Notably absent: host, cookie, and
  // authorization — the browser must never be able to influence any of them.
  const headers = new Headers({ accept: "application/json" });

  const session = await verifySession();
  if (session) headers.set("authorization", `Bearer ${session.token}`);

  let body: BodyInit | undefined;

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.startsWith("multipart/form-data")) {
      // The original header is deliberately not forwarded: its boundary was
      // generated for the browser's serialisation and will not match the body
      // re-serialised by formData(). fetch() sets a correct one.
      body = await request.formData();
    } else if (contentType.includes("application/json")) {
      headers.set("content-type", "application/json");
      body = await request.text();
    } else {
      return NextResponse.json(
        { message: "Only JSON and multipart form bodies are accepted." },
        { status: 415 },
      );
    }
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      // A Laravel redirect must not be followed — it is a response to the
      // client, not an instruction for this proxy.
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { message: "Cannot reach the HomeFix service right now." },
      { status: 503 },
    );
  }

  // A revoked or expired token ends the local session too, so the client can
  // redirect to sign-in instead of retrying against a dead credential.
  if (response.status === 401) {
    await deleteSession();

    return NextResponse.json(
      { code: "unauthenticated", message: "Your session has expired." },
      { status: 401 },
    );
  }

  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  // Streamed straight through, so a large list response is never buffered
  // here. 422 bodies arrive verbatim for forms to map onto their fields.
  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
