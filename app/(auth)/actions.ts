"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  register as registerUser,
  requestPasswordReset,
  resetPassword as resetPasswordWithToken,
  signIn,
} from "@/lib/auth-server";
import { safeNextPath } from "@/lib/navigation";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/errors";
import type { FormState } from "./form-state";

/*
 * Auth flows run as Server Actions rather than through the `/api/auth/*`
 * route handlers. The handlers exist for client components that cannot hold
 * the token; a form has no such constraint, and calling `lib/auth-server.ts`
 * directly avoids a hop through our own HTTP layer.
 *
 * Every action validates with the same zod schema the route handlers use, so
 * the client schema and the server rule cannot drift apart.
 */

/** `FormData.get` returns null for an absent field; zod wants a value. */
function field(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

/** An absent required text field becomes "", so the schema's own message shows. */
function required(formData: FormData, key: string): string {
  return field(formData, key) ?? "";
}

/**
 * A label for the issued token, taken from the User-Agent.
 *
 * Stored on the Sanctum token so a future "active sessions" screen can tell
 * one device from another instead of showing a list of identical rows.
 */
async function deviceName(): Promise<string> {
  const userAgent = (await headers()).get("user-agent")?.trim() ?? "";

  return userAgent.slice(0, 255) || "web";
}

export async function loginAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: required(formData, "email"),
    password: required(formData, "password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: fieldErrors(parsed.error),
    };
  }

  const result = await signIn(parsed.data.email, parsed.data.password, await deviceName());

  if (!result.ok) {
    return { status: "error", message: result.message, errors: result.errors ?? {} };
  }

  // Called outside the branches above: redirect() signals by throwing, so a
  // surrounding try/catch would swallow it.
  redirect(safeNextPath(field(formData, "next"), result.role));
}

export async function registerAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: required(formData, "name"),
    email: required(formData, "email"),
    phone: field(formData, "phone")?.trim() || undefined,
    password: required(formData, "password"),
    password_confirmation: required(formData, "password_confirmation"),
    role: required(formData, "role"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: fieldErrors(parsed.error),
    };
  }

  const result = await registerUser(parsed.data, await deviceName());

  if (!result.ok) {
    return { status: "error", message: result.message, errors: result.errors ?? {} };
  }

  redirect(safeNextPath(null, result.role));
}

export async function forgotPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: required(formData, "email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: fieldErrors(parsed.error),
    };
  }

  const result = await requestPasswordReset(parsed.data.email);

  // The same confirmation whether or not the address exists, matching what
  // Laravel already does — this form must not become an existence oracle.
  return result.ok
    ? { status: "success", message: result.message }
    : { status: "error", message: result.message, errors: result.errors ?? {} };
}

export async function resetPasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: required(formData, "token"),
    email: required(formData, "email"),
    password: required(formData, "password"),
    password_confirmation: required(formData, "password_confirmation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      errors: fieldErrors(parsed.error),
    };
  }

  const result = await resetPasswordWithToken(parsed.data);

  if (!result.ok) {
    return { status: "error", message: result.message, errors: result.errors ?? {} };
  }

  // The reset revoked every existing token, so the only useful next step is a
  // fresh sign-in. `reset=1` lets the login page confirm what just happened.
  redirect("/login?reset=1");
}
