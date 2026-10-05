import "server-only";

import { ApiError, apiFetch } from "./api";
import { isRole, type Role } from "./roles";
import { createSession, deleteSession } from "./session-cookie";

type LaravelUser = {
  id: number;
  name: string;
  email: string;
  role: string | null;
};

type TokenResponse = {
  token: string;
  expires_at: string;
  user: LaravelUser;
};

/**
 * A failed call, shared by every result type here.
 *
 * Failures carry the status and field errors so a caller can decide between a
 * form-level message and per-field errors, without having to re-inspect the
 * Laravel response.
 */
export type Failure = {
  ok: false;
  status: number;
  message: string;
  errors?: Record<string, string[]>;
};

/** The outcome of an authentication attempt. */
export type AuthResult = { ok: true; role: Role } | Failure;

/** The outcome of a call that establishes no session — a password reset. */
export type MessageResult = { ok: true; message: string } | Failure;

/** Pulls Laravel's `message` field out of an error body, when there is one. */
function messageFrom(body: unknown, fallback: string): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  return fallback;
}

/**
 * Turns a token response into a sealed session.
 *
 * The role check is not cosmetic: `proxy.ts` and the DAL route on it, so a
 * session whose role the app does not recognise would be one nothing could
 * safely route. Refusing is better than sealing it and failing later.
 */
async function establishSession(response: TokenResponse): Promise<AuthResult> {
  const { token, expires_at: expiresAtRaw, user } = response;

  if (typeof token !== "string" || token === "" || !isRole(user?.role)) {
    return {
      ok: false,
      status: 502,
      message: "The server returned an unusable session. Please try again.",
    };
  }

  const expiresAt = Math.floor(new Date(expiresAtRaw).getTime() / 1000);

  if (!Number.isFinite(expiresAt)) {
    return {
      ok: false,
      status: 502,
      message: "The server returned an unusable session. Please try again.",
    };
  }

  await createSession({ token, userId: user.id, role: user.role, expiresAt });

  return { ok: true, role: user.role };
}

/** Normalises anything thrown by apiFetch into a failed call. */
function toAuthFailure(error: unknown, fallback: string): Failure {
  if (error instanceof ApiError) {
    return {
      ok: false,
      status: error.status,
      message: messageFrom(error.body, fallback),
      errors: error.validationErrors(),
    };
  }

  // fetch() rejects with a TypeError when Laravel is unreachable. Reported as
  // 503 so the form can say the service is down rather than showing a crash.
  return {
    ok: false,
    status: 503,
    message: "Cannot reach the HomeFix service right now. Please try again shortly.",
  };
}

/** Signs in against Laravel and seals the resulting token into a cookie. */
export async function signIn(
  email: string,
  password: string,
  deviceName: string,
): Promise<AuthResult> {
  try {
    const response = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: { email, password, device_name: deviceName },
    });

    return await establishSession(response);
  } catch (error) {
    return toAuthFailure(error, "Unable to sign in. Please try again.");
  }
}

/** Registers a customer or professional, then signs them straight in. */
export async function register(
  input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
    role: Role;
  },
  deviceName: string,
): Promise<AuthResult> {
  try {
    const response = await apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: { ...input, device_name: deviceName },
    });

    return await establishSession(response);
  } catch (error) {
    return toAuthFailure(error, "Unable to create your account. Please try again.");
  }
}

/**
 * Ends the session.
 *
 * The cookie is cleared even when Laravel rejects the revocation — a sign-out
 * that left the browser holding a live session because the network blipped
 * would be the wrong failure.
 */
export async function signOut(token: string | null): Promise<void> {
  if (token) {
    try {
      await apiFetch("/auth/logout", { method: "POST", token });
    } catch {
      // Revocation is best-effort; the token expires on its own regardless.
    }
  }

  await deleteSession();
}

/**
 * Asks Laravel to email a password-reset link.
 *
 * The response is passed through as-is rather than being interpreted here:
 * Laravel answers identically whether or not the address exists, which is the
 * point — the endpoint must not become an account-existence oracle, and a
 * second opinion in this layer could only reintroduce the leak.
 */
export async function requestPasswordReset(email: string): Promise<MessageResult> {
  try {
    const response = await apiFetch<{ message?: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });

    return {
      ok: true,
      message: messageFrom(
        response,
        "If that email address is registered, a reset link is on its way.",
      ),
    };
  } catch (error) {
    return toAuthFailure(error, "Unable to send the reset link. Please try again.");
  }
}

/** Completes a reset with the token from the emailed link. */
export async function resetPassword(input: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<MessageResult> {
  try {
    const response = await apiFetch<{ message?: string }>("/auth/reset-password", {
      method: "POST",
      body: input,
    });

    return {
      ok: true,
      message: messageFrom(response, "Your password has been reset. You can sign in now."),
    };
  } catch (error) {
    return toAuthFailure(error, "Unable to reset your password. Please try again.");
  }
}
