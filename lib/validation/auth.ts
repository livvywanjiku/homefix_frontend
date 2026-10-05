import { z } from "zod";
import { SELF_ASSIGNABLE_ROLES } from "@/lib/roles";

/*
 * These schemas check *shape* — that a field is present, a string, and
 * plausibly an email. They deliberately do not re-implement the password
 * policy or uniqueness rules: Laravel is the authority on those, and a copy
 * here would drift the moment the server-side rule changed. A 422 from Laravel
 * is mapped back onto the form fields, which is what actually enforces policy.
 */

const email = z
  .email("Enter a valid email address")
  .max(255, "Email addresses cannot exceed 255 characters");

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(255, "Passwords cannot exceed 255 characters");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter your full name")
      .max(255, "Names cannot exceed 255 characters"),
    email,
    phone: z
      .string()
      .trim()
      .max(20, "Phone numbers cannot exceed 20 characters")
      .optional(),
    password,
    password_confirmation: z.string(),
    role: z.enum(SELF_ASSIGNABLE_ROLES),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    email,
    password,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords do not match",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
