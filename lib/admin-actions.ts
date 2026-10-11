import "server-only";

import { ApiError, apiFetch, type HttpMethod } from "./api";
import type { FormState } from "./form-state";

/**
 * The shared plumbing behind every administration Server Action.
 *
 * The console has an action file per area — users, professionals, verification,
 * bookings, the catalogue, administrators, roles, settings — and each of them
 * needs the same four things: read a text field out of the form, reduce a failed
 * call to something a form can render, turn Laravel's 422 bag into field errors,
 * and call the API. Written once here rather than eight times.
 *
 * This module is imported by `"use server"` action modules and never by a
 * component: it carries the session token to Laravel, and `server-only` makes
 * that a build error rather than a mistake waiting to happen. It deliberately
 * exports no async action of its own — a `"use server"` file must export only
 * async functions, so the helpers cannot live in one.
 */

/** `FormData.get` returns null for an absent field; the callers want a value. */
export function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

/** An absent required field becomes "", so the schema's own message shows. */
export function required(formData: FormData, key: string): string {
  return text(formData, key) ?? "";
}

/** A whole number out of a form, or null when it is absent or unparseable. */
export function numeric(formData: FormData, key: string): number | null {
  const value = text(formData, key);

  if (value === undefined || value.trim() === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

/** A checkbox's presence, which is how an HTML form reports a boolean. */
export function checked(formData: FormData, key: string): boolean {
  const value = formData.get(key);

  return value === "on" || value === "true" || value === "1";
}

export function invalid(errors: Record<string, string[]>): FormState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    errors,
  };
}

export function success(message: string): FormState {
  return { status: "success", message };
}

/** Laravel's own `message`, when the body carries one. */
export function messageFrom(body: unknown): string {
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }

  return "That did not work. Please try again.";
}

/**
 * Reduces a failed call to a form state.
 *
 * A 422 becomes field errors, because Laravel is the authority on whether a
 * transition is legal or a target may be acted on and its bag already speaks the
 * shape the form reads. Anything else keeps Laravel's own wording, which for the
 * console is usually the useful part ("A super administrator account cannot be
 * suspended from the console").
 */
export function failureFrom(error: unknown): FormState {
  if (error instanceof ApiError) {
    const errors = error.validationErrors();

    return {
      status: "error",
      message:
        Object.keys(errors).length > 0
          ? "Check the highlighted fields and try again."
          : messageFrom(error.body),
      errors,
    };
  }

  return {
    status: "error",
    message: "Cannot reach the HomeFix service right now. Please try again shortly.",
  };
}

/** Calls Laravel, returning null when it succeeded and a form state when it did not. */
export async function send(
  token: string,
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<FormState | null> {
  try {
    await apiFetch(path, { method, token, body });

    return null;
  } catch (error) {
    return failureFrom(error);
  }
}
