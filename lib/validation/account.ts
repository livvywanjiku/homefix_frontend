import { z } from "zod";

/**
 * The account form's shape check.
 *
 * As with the auth schemas, this does not re-implement the server's policy:
 * Laravel owns uniqueness and the final length rules. The phone is required
 * because it is the number revealed to the other party after an award.
 */
export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your full name")
    .max(255, "Names cannot exceed 255 characters"),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number")
    .max(20, "Phone numbers cannot exceed 20 characters"),
});

export type AccountInput = z.infer<typeof accountSchema>;
