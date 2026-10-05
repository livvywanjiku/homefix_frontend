/**
 * The shape a Server Action returns to `useActionState`.
 *
 * Kept out of `actions.ts` deliberately: a `"use server"` module may only
 * export async functions, so a type or a constant exported from there is a
 * build error rather than a style choice.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** Laravel's 422 bag, keyed by field name. */
  errors?: Record<string, string[]>;
};

export const INITIAL_FORM_STATE: FormState = { status: "idle" };
