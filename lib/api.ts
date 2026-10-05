import "server-only";

/** A failure returned by the Laravel API, or a network failure reaching it. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message?: string,
  ) {
    super(message ?? `Laravel API request failed with status ${status}`);
    this.name = "ApiError";
  }

  /** Laravel's 422 validation bag, when the response carried one. */
  validationErrors(): Record<string, string[]> {
    const body = this.body;

    if (
      typeof body === "object" &&
      body !== null &&
      "errors" in body &&
      typeof (body as { errors: unknown }).errors === "object"
    ) {
      return (body as { errors: Record<string, string[]> }).errors;
    }

    return {};
  }
}

/** The token was missing, expired, or revoked. Callers clear the session. */
export class UnauthenticatedError extends ApiError {
  constructor(body: unknown) {
    super(401, body, "Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export type ApiFetchOptions = {
  method?: HttpMethod;
  /** Plain objects are JSON-encoded; FormData is passed through untouched. */
  body?: unknown;
  /** Sanctum bearer token. Its presence forces an uncached request. */
  token?: string | null;
  search?: Record<string, QueryValue> | URLSearchParams;
  /** Only honoured for token-less requests; see the caching note below. */
  cache?: RequestCache;
  tags?: string[];
  signal?: AbortSignal;
};

/**
 * The configured Laravel base URL, with a guaranteed trailing slash.
 *
 * The trailing slash matters: `new URL("auth/login", "http://host/api")`
 * resolves to `http://host/auth/login`, silently dropping the `/api` prefix.
 */
function apiBase(): URL {
  const configured = process.env.LARAVEL_API_URL;

  if (!configured) {
    throw new Error(
      "LARAVEL_API_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  const base = new URL(configured);
  if (!base.pathname.endsWith("/")) base.pathname += "/";

  return base;
}

/** Drops null/undefined/empty query values so they never reach the API. */
export function toSearchParams(
  search: Record<string, QueryValue> | URLSearchParams,
): URLSearchParams {
  if (search instanceof URLSearchParams) return search;

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }

  return params;
}

/**
 * Builds an absolute Laravel URL, refusing anything that escapes the API base.
 *
 * Two checks, because they catch different escapes: the origin comparison
 * catches a path that resolved to another host, and the pathname prefix check
 * catches `..` segments that stayed on the host but climbed out of `/api`.
 */
export function laravelUrl(
  path: string,
  search?: Record<string, QueryValue> | URLSearchParams,
): URL {
  const base = apiBase();
  const url = new URL(path.replace(/^\/+/, ""), base);

  if (url.origin !== base.origin) {
    throw new Error(`Refusing to build a URL outside the Laravel origin: ${url.href}`);
  }

  if (!url.pathname.startsWith(base.pathname)) {
    throw new Error(`Refusing to build a URL outside ${base.pathname}: ${url.href}`);
  }

  if (search) url.search = toSearchParams(search).toString();

  return url;
}

/**
 * Calls the Laravel API from the server.
 *
 * Requests carrying a token are always uncached: Laravel answers them per-user,
 * and the response cache is not keyed by the Authorization header, so caching
 * one user's response would serve it to another. Token-less requests can opt
 * into caching by passing `cache` and `tags`.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { method = "GET", body, token, search, tags, signal } = options;

  const headers = new Headers({ accept: "application/json" });

  if (token) headers.set("authorization", `Bearer ${token}`);

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    // Let fetch set content-type so the multipart boundary matches the body.
    payload = body;
  } else if (body !== undefined) {
    headers.set("content-type", "application/json");
    payload = JSON.stringify(body);
  }

  const response = await fetch(laravelUrl(path, search), {
    method,
    headers,
    body: payload,
    cache: token ? "no-store" : (options.cache ?? "no-store"),
    ...(tags && !token ? { next: { tags } } : {}),
    signal,
  });

  const responseBody = await readBody(response);

  if (!response.ok) {
    if (response.status === 401) throw new UnauthenticatedError(responseBody);
    throw new ApiError(response.status, responseBody);
  }

  return responseBody as T;
}

/** Parses a JSON body, tolerating the empty bodies that 204 and 202 return. */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const text = await response.text();
  if (text === "") return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(
      response.status,
      text,
      "Laravel API returned a body that is not valid JSON",
    );
  }
}
