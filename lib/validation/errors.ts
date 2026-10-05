import type { ZodError } from "zod";

/**
 * Converts zod issues into Laravel's `{ field: [messages] }` validation shape.
 *
 * Both producers of a 422 — this app's own schema check and Laravel's
 * validator — then reach the client in one shape, so a form has a single way
 * to map errors onto its fields.
 */
export function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (errors[key] ??= []).push(issue.message);
  }

  return errors;
}
