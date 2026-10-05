"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

const BASE =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/*
 * Primary is brand blue for ordinary actions; accent is the orange reserved for
 * the main call to action on a page ("Book now", "Request service"), which is
 * why it is a separate variant rather than the default.
 */
const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-600",
  accent: "bg-accent text-navy hover:bg-accent-600",
  secondary: "border border-line bg-card text-foreground hover:bg-surface",
  ghost: "text-muted-foreground hover:bg-surface hover:text-foreground",
  danger: "border border-danger/30 text-danger hover:bg-danger-50",
} as const;

const SIZES = {
  sm: "h-9 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}

/**
 * A submit button that locks itself while its form's action is in flight.
 *
 * `useFormStatus` reads the parent `<form>`, so this must be rendered inside
 * one. Locking on the real pending state — rather than a local `isSubmitting`
 * flag — is what actually prevents a double submit, since it also covers the
 * server round trip.
 */
export function SubmitButton({
  children,
  pendingLabel = "Working…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** A link styled as a button, for navigational actions that are not form submits. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"a"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}) {
  return (
    <a
      {...props}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}
