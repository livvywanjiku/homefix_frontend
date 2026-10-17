"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, apiFetch, type HttpMethod } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";
import type { Item, ServiceRequest } from "@/lib/types";
import { fieldErrors } from "@/lib/validation/errors";
import {
  cancelRequestSchema,
  serviceRequestSchema,
  type ServiceRequestInput,
} from "@/lib/validation/requests";

/*
 * The customer's service requests, as Server Actions.
 *
 * Every action repeats the same three steps — check the role, validate the
 * shape, call Laravel — for the same reason the professional workspace does:
 * the form has no token of its own, and `requireRole` is the authoritative gate
 * a client component cannot skip.
 *
 * The Laravel routes resolve the customer from the authenticated account and
 * scope every query to them, so no action here passes a customer id. There is
 * nothing in a request body that could point at somebody else's job.
 */

/** `FormData.get` returns null for an absent field; the schemas want a value. */
function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

/** An absent required text field becomes "", so the schema's own message shows. */
function required(formData: FormData, key: string): string {
  return text(formData, key) ?? "";
}

function invalid(errors: Record<string, string[]>): FormState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    errors,
  };
}

/** Laravel's own `message`, when the body carries one. */
function messageFrom(body: unknown): string {
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
 * Laravel keys array failures by index ("images.0"), while the form has one
 * control per field. Fold those back onto the field so the message appears
 * under it instead of only in the summary banner.
 */
function normalize(errors: Record<string, string[]>): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};

  for (const [key, messages] of Object.entries(errors)) {
    const field = key.split(".")[0];
    (normalized[field] ??= []).push(...messages);
  }

  return normalized;
}

/**
 * Reduces a failed call to a form state.
 *
 * A 422 becomes field errors — Laravel is the authority on whether a service is
 * still offered or a date has passed, and its bag already speaks the shape the
 * form reads. Anything else keeps Laravel's own wording, which for this section
 * is usually the useful part ("a job that has been awarded cannot be cancelled").
 */
function failureFrom(error: unknown): FormState {
  if (error instanceof ApiError) {
    const errors = normalize(error.validationErrors());

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

/** Calls Laravel, returning null when it succeeded. */
async function send(
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

/** The dashboard carries counts drawn from this section, so it is refreshed too. */
function refresh(): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/requests");
}

/** Reads and checks the form, returning either the values or the errors to show. */
function parse(formData: FormData): ServiceRequestInput | FormState {
  const parsed = serviceRequestSchema.safeParse({
    service_id: formData.get("service_id"),
    location_id: formData.get("location_id"),
    title: required(formData, "title"),
    description: required(formData, "description"),
    urgency: required(formData, "urgency"),
    preferred_date: text(formData, "preferred_date"),
    preferred_time_slot: text(formData, "preferred_time_slot"),
    budget_min: formData.get("budget_min"),
    budget_max: formData.get("budget_max"),
    address: text(formData, "address"),
    instructions: text(formData, "instructions"),
    latitude: text(formData, "latitude"),
    longitude: text(formData, "longitude"),
  });

  return parsed.success ? parsed.data : invalid(fieldErrors(parsed.error));
}

function isFormState(value: ServiceRequestInput | FormState): value is FormState {
  return "status" in value;
}

/** Every optional column, mapped from the API's field name to the schema's. */
const OPTIONAL: [string, keyof ServiceRequestInput][] = [
  ["preferred_date", "preferred_date"],
  ["preferred_time_slot", "preferred_time_slot"],
  ["budget_min_cents", "budget_min"],
  ["budget_max_cents", "budget_max"],
  ["address", "address"],
  ["instructions", "instructions"],
  ["latitude", "latitude"],
  ["longitude", "longitude"],
];

/**
 * Builds the payload Laravel expects.
 *
 * Rebuilt field by field rather than forwarding the browser's `FormData`: that
 * would post whatever the form happened to contain, and this is the boundary
 * where the API's contract is fixed.
 *
 * Absent optional fields travel as an empty string. Laravel's `nullable` rules
 * treat that as "not provided", and sending the key at all is what lets an edit
 * clear a budget — an omitted key would leave the previous value in place.
 */
function payload(
  formData: FormData,
  values: ServiceRequestInput,
  withImages = false,
): FormData {
  const body = new FormData();

  body.append("service_id", String(values.service_id));
  body.append("location_id", String(values.location_id));
  body.append("title", values.title);
  body.append("description", values.description);
  body.append("urgency", values.urgency);

  for (const [field, key] of OPTIONAL) {
    const value = values[key];
    body.append(field, value === undefined || value === null ? "" : String(value));
  }

  // Only on create. An edit carries no file input, and the update endpoint
  // ignores `images` on purpose — pictures are added and removed through their
  // own endpoints so that re-saving the text cannot drop them.
  if (withImages) {
    for (const entry of formData.getAll("images")) {
      if (entry instanceof File && entry.size > 0) body.append("images[]", entry);
    }
  }

  return body;
}

/**
 * Posts a job and lands the customer on it.
 *
 * Photos travel with the create call so the whole thing is one step: a request
 * that half-exists because its pictures failed to upload is worse than one that
 * failed outright.
 */
export async function createRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("customer");

  const values = parse(formData);

  if (isFormState(values)) return values;

  let created: ServiceRequest;

  try {
    const response = await apiFetch<Item<ServiceRequest>>("/service-requests", {
      method: "POST",
      token: session.token,
      body: payload(formData, values, true),
    });

    created = response.data;
  } catch (error) {
    return failureFrom(error);
  }

  refresh();

  // `redirect` throws to unwind the render, so it comes last — after the job
  // exists and the caches that list it have been cleared.
  redirect(`/dashboard/requests/${created.id}?posted=1`);
}

/** Edits a job that is still open. The API refuses once anyone has quoted. */
export async function updateRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("customer");
  const id = required(formData, "id");

  const values = parse(formData);

  if (isFormState(values)) return values;

  const failure = await send(
    session.token,
    "PUT",
    `/service-requests/${id}`,
    payload(formData, values),
  );

  if (failure) return failure;

  revalidatePath(`/dashboard/requests/${id}`);
  refresh();

  return { status: "success", message: "Your request has been updated." };
}

/**
 * Cancels a job.
 *
 * The API decides whether cancelling is allowed at this point in the request's
 * life, and its refusal is rendered rather than swallowed — "a job that has been
 * awarded cannot be cancelled" is the sentence the customer needs.
 */
export async function cancelRequestAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("customer");
  const id = required(formData, "id");

  const parsed = cancelRequestSchema.safeParse({ reason: text(formData, "reason") });

  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const failure = await send(session.token, "POST", `/service-requests/${id}/cancel`, {
    reason: parsed.data.reason || null,
  });

  revalidatePath(`/dashboard/requests/${id}`);
  refresh();

  if (failure) return failure;

  return { status: "success", message: "That request has been cancelled." };
}

export async function uploadRequestImagesAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("customer");
  const id = required(formData, "id");

  const chosen = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (chosen.length === 0) return invalid({ images: ["Choose at least one photo"] });

  // Rebuilt rather than forwarded: the endpoint expects only files under
  // `images[]`, and `id` belongs in the path, not the body.
  const body = new FormData();
  for (const file of chosen) body.append("images[]", file);

  const failure = await send(session.token, "POST", `/service-requests/${id}/images`, body);

  if (failure) return failure;

  revalidatePath(`/dashboard/requests/${id}`);

  return {
    status: "success",
    message: `${chosen.length === 1 ? "Photo" : "Photos"} added.`,
  };
}

export async function deleteRequestImageAction(formData: FormData): Promise<void> {
  const session = await requireRole("customer");
  const request = text(formData, "id");
  const image = text(formData, "image_id");

  if (!request || !image) return;

  await send(session.token, "DELETE", `/service-requests/${request}/images/${image}`);

  revalidatePath(`/dashboard/requests/${request}`);
}

/* ── Quotations ────────────────────────────────────────────────────────── */

/**
 * Awards the job to one quote.
 *
 * Accepting settles every other live offer on the job in the same transaction
 * and creates the booking, so the "are you sure?" lives in the UI rather than
 * here. On success the page is re-rendered from Laravel: the request is no
 * longer open, the losing quotes read "rejected", and the winner carries its
 * booking — none of which this action could invent locally.
 *
 * Failures come back as form state rather than being swallowed: a quote that
 * was withdrawn or expired while the customer was reading the page answers
 * 422, and the wording in that response is the useful part.
 */
export async function acceptQuotationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("customer");
  const request = required(formData, "request_id");
  const quotation = required(formData, "quotation_id");

  if (!request || !quotation) {
    return { status: "error", message: "That quote is no longer available." };
  }

  const failure = await send(
    session.token,
    "POST",
    `/service-requests/${request}/quotations/${quotation}/accept`,
  );

  revalidatePath(`/dashboard/requests/${request}`);
  refresh();

  if (failure) return failure;

  // `redirect` throws to unwind the render, so it comes last.
  redirect(`/dashboard/requests/${request}?awarded=1`);
}

/**
 * Declines one quote and leaves the job open to the others.
 *
 * Deliberately not a step towards awarding: the customer can turn three of
 * four offers down and still be deciding. Only the accepting action closes the
 * job.
 */
export async function rejectQuotationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("customer");
  const request = required(formData, "request_id");
  const quotation = required(formData, "quotation_id");

  if (!request || !quotation) {
    return { status: "error", message: "That quote is no longer available." };
  }

  const failure = await send(
    session.token,
    "POST",
    `/service-requests/${request}/quotations/${quotation}/reject`,
  );

  revalidatePath(`/dashboard/requests/${request}`);
  refresh();

  if (failure) return failure;

  return {
    status: "success",
    message: "That quote has been declined. The job stays open to the others.",
  };
}
