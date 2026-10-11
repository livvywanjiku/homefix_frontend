import { z } from "zod";

/*
 * Shape checks for the `/pro` forms.
 *
 * As with `lib/validation/auth.ts`, these check that a field is present and
 * plausibly formed, and deliberately stop there. Laravel owns the real rules —
 * price ranges, location activity, the unique service per profile — and its 422
 * is mapped back onto the fields, so duplicating those rules here would only
 * create a second copy to keep in step.
 */

/** Treats an absent or blank control as "not provided" rather than as 0. */
function blankToUndefined(value: unknown): unknown {
  return value === "" || value === null || value === undefined ? undefined : value;
}

/**
 * A whole number of *shillings*, converted to the minor units the API wants.
 *
 * Money is stored and transported as integer cents, but nobody types cents —
 * the form says "KSh 1,500" and the conversion happens here, once, so no
 * arithmetic on a shilling figure leaks into a component.
 */
const shillings = z.preprocess((value) => {
  const present = blankToUndefined(value);
  if (present === undefined) return undefined;

  const parsed = Number(present);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : value;
}, z.number().int().min(0, "Prices cannot be negative").max(100_000_000, "That price looks too high").optional());

const experienceYears = z.preprocess(
  blankToUndefined,
  z.coerce
    .number()
    .int()
    .min(0, "Experience cannot be negative")
    .max(70, "That seems too high")
    .optional(),
);

export const profileSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, "Enter your business or trading name")
    .max(160, "Keep this under 160 characters"),
  about: z.string().trim().max(2000, "Keep this under 2000 characters").optional(),
  experience_years: experienceYears,
  phone: z.string().trim().max(20, "Phone numbers cannot exceed 20 characters").optional(),
  base_location_id: z.coerce
    .number()
    .int()
    .positive("Choose the town you work from"),
  service_area_ids: z
    .array(z.coerce.number().int().positive())
    .max(30, "Choose at most 30 towns"),
});

const pricingType = z.enum(["fixed", "hourly", "quote"]);

export const offeringSchema = z
  .object({
    service_id: z.coerce.number().int().positive("Choose a service"),
    description: z.string().trim().max(1000, "Keep this under 1000 characters").optional(),
    pricing_type: pricingType,
    price_min: shillings,
    price_max: shillings,
  })
  .refine((data) => data.pricing_type === "quote" || data.price_min !== undefined, {
    path: ["price_min"],
    message: "Enter your starting price, or price this on inspection",
  })
  .refine(
    (data) =>
      data.price_min === undefined ||
      data.price_max === undefined ||
      data.price_max >= data.price_min,
    { path: ["price_max"], message: "The upper price cannot be below the lower one" },
  );

export const portfolioItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give this job a title")
    .max(160, "Keep this under 160 characters"),
  description: z.string().trim().max(2000, "Keep this under 2000 characters").optional(),
  service_id: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  location_id: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  completed_on: z.preprocess(blankToUndefined, z.string().trim().optional()),
});

export const documentSchema = z.object({
  type: z.enum(["national_id", "certificate", "license", "insurance", "other"], {
    message: "Choose which kind of document this is",
  }),
});

export const exceptionSchema = z.object({
  blocked_on: z.string().trim().min(1, "Choose a date to block"),
  reason: z.string().trim().max(160, "Keep this under 160 characters").optional(),
});

/**
 * One row of the weekly grid: a day is either worked, with a window, or it is
 * not. `null` means the professional cleared the day, which is how the API
 * learns to delete it.
 */
export const availabilityDaySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Enter a start time"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Enter an end time"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type OfferingInput = z.infer<typeof offeringSchema>;
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
export type AvailabilityDayInput = z.infer<typeof availabilityDaySchema>;
