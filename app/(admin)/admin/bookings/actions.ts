"use server";

import { revalidatePath } from "next/cache";
import { BOOKING_STATUS_OPTIONS, can } from "@/lib/admin";
import { currentAdmin } from "@/lib/admin-server";
import { invalid, required, send, text } from "@/lib/admin-actions";
import type { FormState } from "@/lib/form-state";

/*
 * Moving a booking.
 *
 * The console does not decide which moves are legal — it offers the ones the
 * API said were available on this booking, and then lets Laravel refuse the
 * request if the booking moved in the meantime. That ordering matters: two
 * administrators looking at the same dispute is a real situation, and the
 * second one to press the button should be told the state changed rather than
 * silently overwrite the first.
 *
 * The status vocabulary is checked against the enum's own list so a hand-rolled
 * request fails here with a sentence rather than at Laravel with a validation
 * error about a field the administrator never chose.
 */

export async function transitionBookingAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { session, account } = await currentAdmin();

  if (!can(account.permissions, "manage_bookings")) {
    return {
      status: "error",
      message: "Your account does not hold the manage_bookings permission.",
    };
  }

  const id = required(formData, "booking_id");
  const status = required(formData, "status");
  const note = text(formData, "note");

  if (!id) return invalid({ status: ["No booking was identified."] });

  const known = BOOKING_STATUS_OPTIONS.some((option) => option.value === status);

  if (!known) return invalid({ status: ["Choose the state to move this booking to."] });

  const failure = await send(session.token, "POST", `/admin/bookings/${id}/transition`, {
    status,
    ...(note?.trim() ? { note: note.trim() } : {}),
  });

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);

  if (failure) return failure;

  const label = BOOKING_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

  return { status: "success", message: `Moved to ${label.toLowerCase()}.` };
}
