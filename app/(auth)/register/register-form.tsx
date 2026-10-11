"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";
import { isSelfAssignableRole, SELF_ASSIGNABLE_ROLES, type Role } from "@/lib/roles";
import { registerAction } from "../actions";
import { INITIAL_FORM_STATE } from "../form-state";

/**
 * Copy for the account-type choice.
 *
 * Keyed by role and exhausting it with `Record<Role, …>`, so adding a
 * self-assignable role without describing it is a type error rather than a
 * radio button with no label.
 */
const ROLE_COPY: Record<(typeof SELF_ASSIGNABLE_ROLES)[number], { title: string; blurb: string }> =
  {
    customer: { title: "Customer", blurb: "I need work done" },
    professional: { title: "Professional", blurb: "I do the work" },
  };

export function RegisterForm({ defaultRole }: { defaultRole?: Role }) {
  const [state, action] = useActionState(registerAction, INITIAL_FORM_STATE);

  // Falls back rather than trusting `?role=`: the query string is user-editable,
  // so it preselects a choice but never overrides one.
  const preselected = isSelfAssignableRole(defaultRole) ? defaultRole : "customer";

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.status === "error" && state.message ? (
        <FormMessage>{state.message}</FormMessage>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">I am joining as a…</legend>

        <div className="grid grid-cols-2 gap-2">
          {SELF_ASSIGNABLE_ROLES.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer flex-col gap-0.5 rounded-lg border border-black/12 p-3 text-sm transition hover:bg-black/3 has-checked:border-foreground has-checked:bg-foreground/4 dark:border-white/16 dark:hover:bg-white/6"
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="role"
                  value={role}
                  defaultChecked={role === preselected}
                  required
                />
                {ROLE_COPY[role].title}
              </span>
              <span className="pl-6 text-xs text-zinc-500 dark:text-zinc-400">
                {ROLE_COPY[role].blurb}
              </span>
            </label>
          ))}
        </div>

        {/* The role list is the server's to enforce; this only surfaces a
            rejection, such as a crafted submission naming `admin`. */}
        {state.errors?.role ? (
          <p className="text-xs text-red-600 dark:text-red-400">{state.errors.role[0]}</p>
        ) : null}
      </fieldset>

      <Field name="name" label="Full name" errors={state.errors?.name}>
        {(props) => <Input {...props} autoComplete="name" required />}
      </Field>

      <Field name="email" label="Email" errors={state.errors?.email}>
        {(props) => (
          <Input
            {...props}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        )}
      </Field>

      <Field
        name="phone"
        label="Phone"
        hint="Optional — professionals are easier to reach on the day."
        errors={state.errors?.phone}
      >
        {(props) => (
          <Input {...props} type="tel" autoComplete="tel" placeholder="+254 7…" />
        )}
      </Field>

      <Field
        name="password"
        label="Password"
        hint="At least 8 characters, with letters and numbers."
        errors={state.errors?.password}
      >
        {(props) => (
          <PasswordInput {...props} autoComplete="new-password" required />
        )}
      </Field>

      <Field
        name="password_confirmation"
        label="Confirm password"
        errors={state.errors?.password_confirmation}
      >
        {(props) => (
          <PasswordInput {...props} autoComplete="new-password" required />
        )}
      </Field>

      <SubmitButton pendingLabel="Creating your account…">Create account</SubmitButton>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already registered?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
