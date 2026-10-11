import { z } from "zod";

/*
 * Shape checks for the customer's service-request forms.
 *
 * As elsewhere, these check that a field is present and plausibly formed and
 * stop there. Laravel owns the rules that matter — that the service is active,
 * that the town exists, that the roof is not below the floor, that the date is
 * not in the past — and its 422 is mapped back onto the fields. Duplicating
 * those here would only create a second copy to keep in step.
 */

/** Treats an absent or blank control as "not provided" rather than as 0. */
function blankToUndefined(value: unknown): unknown {
  return value === "" || value === null || value === undefined ? undefined : value;
}

/**
 * A whole number of *shillings*, converted to the minor units the API wants.
 *
 * Money is stored and transported as integer cents, but nobody types cents, so
 * the conversion happens once here rather than in a component.
 */
const shillings = z.preprocess((value) => {
  const present = blankToUndefined(value);
  if (present === undefined) return undefined;

  const parsed = Number(present);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : value;
}, z.number().int().min(0, "A budget cannot be negative").max(100_000_000, "That budget looks too high").optional());

/** An optional coordinate, which travels only as a matched pair. */
const coordinate = (limit: number, label: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number().min(-limit, `${label} is out of range`).max(limit, `${label} is out of range`).optional(),
  );

export const serviceRequestSchema = z
  .object({
    service_id: z.coerce.number().int().positive("Choose the service you need"),
    location_id: z.coerce.number().int().positive("Choose where the job is"),

    title: z
      .string()
      .trim()
      .min(1, "Give the job a short title")
      .max(150, "Keep the title under 150 characters"),

    // The floor is the API's own: a request nobody can quote from is a request
    // that wastes a professional's time.
    description: z
      .string()
      .trim()
      .min(20, "Describe the job in at least 20 characters so a professional can quote it")
      .max(5000, "Keep the description under 5000 characters"),

    urgency: z.enum(["flexible", "soon", "urgent"]),

    preferred_date: z.string().trim().optional(),
    preferred_time_slot: z.enum(["morning", "afternoon", "evening"]).optional(),

    budget_min: shillings,
    budget_max: shillings,

    address: z.string().trim().max(255, "Keep the address under 255 characters").optional(),
    instructions: z.string().trim().max(2000, "Keep the notes under 2000 characters").optional(),

    latitude: coordinate(90, "Latitude"),
    longitude: coordinate(180, "Longitude"),
  })
  .refine(
    (value) =>
      value.budget_min === undefined ||
      value.budget_max === undefined ||
      value.budget_max >= value.budget_min,
    { message: "The upper budget must be at least the lower one", path: ["budget_max"] },
  )
  .refine(
    // A latitude without a longitude puts the job in the Gulf of Guinea, which
    // is why the API refuses the pair half-supplied — and why the form cannot
    // submit it in the first place.
    (value) => (value.latitude === undefined) === (value.longitude === undefined),
    { message: "Drop the pin again so both coordinates are set", path: ["latitude"] },
  );

export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

export const cancelRequestSchema = z.object({
  reason: z.string().trim().max(500, "Keep the reason under 500 characters").optional(),
});
