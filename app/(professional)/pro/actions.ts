"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiFetch, type HttpMethod } from "@/lib/api";
import { requireRole } from "@/lib/dal";
import type { FormState } from "@/lib/form-state";
import { fieldErrors } from "@/lib/validation/errors";
import {
  availabilityDaySchema,
  documentSchema,
  exceptionSchema,
  offeringSchema,
  portfolioItemSchema,
  profileSchema,
  type AvailabilityDayInput,
} from "@/lib/validation/professional";

/*
 * The professional workspace, as Server Actions.
 *
 * Every action follows the same three steps — check the role, validate the
 * shape, call Laravel — for the same reason the auth actions do: the form has
 * no token of its own, and `requireRole` is the authoritative gate that a
 * client component cannot skip.
 *
 * The Laravel endpoints under `/professional/*` resolve the profile from the
 * authenticated account, so no action here passes a profile id. There is
 * nothing in a request body that could point at somebody else's profile.
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

/**
 * Calls Laravel and reduces the outcome to "succeeded" or "here is the form
 * state to render".
 *
 * A 422 becomes field errors, which is the case worth getting right — Laravel
 * is the authority on price ranges and duplicate services, and its bag already
 * speaks the shape the form reads. A 403 or 404 is surfaced as a form-level
 * message rather than being allowed to look like a crash: in this section those
 * mean the row was deleted in another tab, which is worth saying plainly.
 */
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
 * Refreshes the pages that show the data an action just changed.
 *
 * The dashboard carries counts drawn from every part of the workspace, so it is
 * refreshed alongside the page the form lived on — otherwise a professional
 * saves a service and returns to a dashboard that still says they have none.
 */
function refresh(...paths: string[]): void {
  for (const path of [...paths, "/pro"]) revalidatePath(path);
}

/* ── Profile ───────────────────────────────────────────────────────────── */

export async function saveProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("professional");

  const parsed = profileSchema.safeParse({
    business_name: required(formData, "business_name"),
    about: text(formData, "about"),
    experience_years: formData.get("experience_years"),
    phone: text(formData, "phone"),
    base_location_id: formData.get("base_location_id"),
    service_area_ids: formData.getAll("service_area_ids"),
  });

  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const failure = await send(session.token, "PUT", "/professional/profile", {
    ...parsed.data,
    // Blanks travel as null so clearing a field actually clears it, rather than
    // being dropped from the payload and leaving the old value in place.
    about: parsed.data.about || null,
    phone: parsed.data.phone || null,
  });

  if (failure) return failure;

  refresh("/pro/profile");

  return { status: "success", message: "Your profile has been saved." };
}

/* ── Services ──────────────────────────────────────────────────────────── */

export async function saveOfferingAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("professional");
  const id = text(formData, "id");

  const parsed = offeringSchema.safeParse({
    service_id: formData.get("service_id"),
    description: text(formData, "description"),
    pricing_type: required(formData, "pricing_type"),
    price_min: formData.get("price_min"),
    price_max: formData.get("price_max"),
  });

  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const priced = parsed.data.pricing_type !== "quote";

  const failure = await send(
    session.token,
    id ? "PUT" : "POST",
    id ? `/professional/services/${id}` : "/professional/services",
    {
      // `service_id` is not sent on an update: the request class refuses it, so
      // an offering cannot be quietly repointed at a different catalogue entry.
      ...(id ? {} : { service_id: parsed.data.service_id }),
      description: parsed.data.description || null,
      pricing_type: parsed.data.pricing_type,
      price_min_cents: priced ? parsed.data.price_min : null,
      price_max_cents: priced ? parsed.data.price_max : null,
      is_active: formData.get("is_active") === "on",
    },
  );

  if (failure) return failure;

  refresh("/pro/services");

  return {
    status: "success",
    message: id ? "Your offering has been updated." : "That service is now on your profile.",
  };
}

/**
 * Removes an offering.
 *
 * Takes FormData rather than `(previous, formData)` because there is nothing to
 * report back — the row disappears, and a failure is better shown by the page
 * than by a form that no longer exists.
 */
export async function deleteOfferingAction(formData: FormData): Promise<void> {
  const session = await requireRole("professional");
  const id = text(formData, "id");

  if (id) await send(session.token, "DELETE", `/professional/services/${id}`);

  refresh("/pro/services");
}

/* ── Availability ──────────────────────────────────────────────────────── */

/**
 * Replaces the whole week.
 *
 * The grid is submitted as seven day rows rather than one JSON blob so that a
 * validation message can be attached to the exact input that caused it — which
 * is why the errors below are keyed `day_3_end_time` and not by array index.
 */
export async function saveAvailabilityAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("professional");

  const days: AvailabilityDayInput[] = [];
  const errors: Record<string, string[]> = {};

  for (let day = 0; day < 7; day += 1) {
    if (formData.get(`day_${day}_enabled`) !== "on") continue;

    const parsed = availabilityDaySchema.safeParse({
      day_of_week: day,
      start_time: required(formData, `day_${day}_start`),
      end_time: required(formData, `day_${day}_end`),
    });

    if (!parsed.success) {
      for (const [key, messages] of Object.entries(fieldErrors(parsed.error))) {
        errors[`day_${day}_${key}`] = messages;
      }
      continue;
    }

    // Zero-padded 24-hour strings compare correctly as text, so this needs no
    // date parsing — and it is checked per day, because a shared `after:` rule
    // would compare Tuesday's finish against Monday's start.
    if (parsed.data.end_time <= parsed.data.start_time) {
      errors[`day_${day}_end_time`] = ["The finish time must be after the start time"];
      continue;
    }

    days.push(parsed.data);
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted days and try again.",
      errors,
    };
  }

  const failure = await send(session.token, "PUT", "/professional/availability", { days });

  if (failure) return failure;

  refresh("/pro/availability");

  return {
    status: "success",
    message: days.length === 0
      ? "Your working hours have been cleared."
      : "Your working hours have been saved.",
  };
}

export async function blockDateAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("professional");

  const parsed = exceptionSchema.safeParse({
    blocked_on: required(formData, "blocked_on"),
    reason: text(formData, "reason"),
  });

  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const failure = await send(session.token, "POST", "/professional/availability/exceptions", {
    blocked_on: parsed.data.blocked_on,
    reason: parsed.data.reason || null,
  });

  if (failure) return failure;

  refresh("/pro/availability");

  return { status: "success", message: "That date is now blocked out." };
}

export async function unblockDateAction(formData: FormData): Promise<void> {
  const session = await requireRole("professional");
  const id = text(formData, "id");

  if (id) await send(session.token, "DELETE", `/professional/availability/exceptions/${id}`);

  refresh("/pro/availability");
}

/* ── Portfolio ─────────────────────────────────────────────────────────── */

export async function savePortfolioItemAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("professional");
  const id = text(formData, "id");

  const parsed = portfolioItemSchema.safeParse({
    title: required(formData, "title"),
    description: text(formData, "description"),
    service_id: formData.get("service_id"),
    location_id: formData.get("location_id"),
    completed_on: text(formData, "completed_on"),
  });

  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const failure = await send(
    session.token,
    id ? "PUT" : "POST",
    id ? `/professional/portfolio/${id}` : "/professional/portfolio",
    {
      ...parsed.data,
      description: parsed.data.description || null,
      service_id: parsed.data.service_id ?? null,
      location_id: parsed.data.location_id ?? null,
      completed_on: parsed.data.completed_on || null,
      is_published: formData.get("is_published") === "on",
    },
  );

  if (failure) return failure;

  refresh("/pro/portfolio");

  return {
    status: "success",
    message: id ? "That job has been updated." : "That job has been added to your portfolio.",
  };
}

export async function deletePortfolioItemAction(formData: FormData): Promise<void> {
  const session = await requireRole("professional");
  const id = text(formData, "id");

  if (id) await send(session.token, "DELETE", `/professional/portfolio/${id}`);

  refresh("/pro/portfolio");
}

export async function uploadPortfolioImagesAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("professional");
  const id = required(formData, "id");

  const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return invalid({ images: ["Choose at least one photo"] });
  }

  // Rebuilt rather than forwarded: `formData.get("id")` is a plain field and
  // the endpoint expects only files under `images[]`, so passing the form
  // through untouched would post an unexpected `id` alongside them.
  const payload = new FormData();
  for (const file of files) payload.append("images[]", file);

  const failure = await send(session.token, "POST", `/professional/portfolio/${id}/images`, payload);

  if (failure) return failure;

  refresh("/pro/portfolio");

  return { status: "success", message: `${files.length === 1 ? "Photo" : "Photos"} added.` };
}

export async function deletePortfolioImageAction(formData: FormData): Promise<void> {
  const session = await requireRole("professional");
  const item = text(formData, "item_id");
  const image = text(formData, "image_id");

  if (item && image) {
    await send(session.token, "DELETE", `/professional/portfolio/${item}/images/${image}`);
  }

  refresh("/pro/portfolio");
}

/* ── Verification ──────────────────────────────────────────────────────── */

export async function uploadDocumentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireRole("professional");

  const parsed = documentSchema.safeParse({ type: required(formData, "type") });

  if (!parsed.success) return invalid(fieldErrors(parsed.error));

  const file = formData.get("document");

  if (!(file instanceof File) || file.size === 0) {
    return invalid({ document: ["Choose a file to upload"] });
  }

  const payload = new FormData();
  payload.append("type", parsed.data.type);
  payload.append("document", file);

  const failure = await send(session.token, "POST", "/professional/documents", payload);

  if (failure) return failure;

  refresh("/pro/verification");

  return {
    status: "success",
    message: "Document filed. Our team reviews new documents within one working day.",
  };
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const session = await requireRole("professional");
  const id = text(formData, "id");

  if (id) await send(session.token, "DELETE", `/professional/documents/${id}`);

  refresh("/pro/verification");
}

/**
 * Takes no input: there is nothing to collect, only a button to press.
 *
 * The zero-argument signature is assignable where `useActionState` expects
 * `(state, payload) => state`, so the form works and the parameters do not have
 * to be invented just to be ignored.
 */
export async function submitForVerificationAction(): Promise<FormState> {
  const session = await requireRole("professional");

  const failure = await send(session.token, "POST", "/professional/verification/submit");

  if (failure) return failure;

  refresh("/pro/verification");

  return {
    status: "success",
    message: "Your application is in the review queue. We will be in touch shortly.",
  };
}
