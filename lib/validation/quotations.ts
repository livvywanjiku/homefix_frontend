import { z } from "zod";

/*
 * Shape checks for the quotation forms.
 *
 * As elsewhere, these decide only that a field is present and plausibly formed.
 * Laravel owns the rules that matter — that the job is still open, that the
 * professional is verified, that the price deadline has not already passed —
 * and its 422 is mapped back onto the fields. Duplicating those here would
 * create a second copy to keep in step.
 */

/** Treats an absent or blank control as "not provided" rather than as 0. */
function blankToUndefined(value: unknown): unknown {
  return value === "" || value === null || value === undefined ? undefined : value;
}

/**
 * A line price in whole shillings, converted to the minor units the API wants.
 *
 * Nobody types cents, so the conversion happens once here — and the floor is one
 * cent, because a line that costs nothing is a line the professional has not
 * priced.
 */
const unitPrice = z.preprocess((value) => {
  const present = blankToUndefined(value);
  if (present === undefined) return undefined;

  const parsed = Number(present);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : value;
}, z
  .number({ error: "Give this line a price" })
  .int()
  .min(1, "A line has to cost something")
  .max(100_000_000, "That price looks too high"));

/** An optional whole-day count, which the API caps at a year. */
const optionalDays = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(1, "At least one day").max(365, "That is over a year").optional(),
);

/** An optional ISO date, passed through as typed. */
const optionalDate = z.preprocess(blankToUndefined, z.string().trim().optional());

export const QUOTATION_ITEM_CATEGORIES = [
  { value: "labour", label: "Labour" },
  { value: "materials", label: "Materials" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
] as const;

/**
 * One line of the breakdown.
 *
 * `quantity` is a decimal because material is bought by the metre and paint by
 * the litre; the API rounds the line to the nearest cent and the form shows the
 * same arithmetic so the two never disagree on screen.
 */
export const quotationItemSchema = z.object({
  category: z.enum(["labour", "materials", "transport", "other"]),
  description: z
    .string()
    .trim()
    .min(1, "Say what this line is for")
    .max(150, "Keep it under 150 characters"),
  quantity: z.coerce
    .number()
    .min(0.01, "A quantity has to be more than zero")
    .max(999_999.99, "That quantity looks too high"),
  unit_price: unitPrice,
});

export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

/** The whole form, once its lines are collected. */
export const quotationSchema = z.object({
  message: z.string().trim().max(2000, "Keep your note under 2000 characters").optional(),
  estimated_days: optionalDays,
  available_from: optionalDate,
  valid_until: optionalDate,
});

export type QuotationInput = z.infer<typeof quotationSchema>;

/** The two decisions a customer makes, both with an optional note. */
export const quotationDecisionSchema = z.object({
  reason: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});
