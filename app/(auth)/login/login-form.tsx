"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction } from "../actions";
import { INITIAL_FORM_STATE } from "../form-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, INITIAL_FORM_STATE);

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Carried through the submission so the post-sign-in redirect lands
          where the user was originally headed. Re-validated server-side. */}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message ? (
        <FormMessage>{state.message}</FormMessage>
      ) : null}

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

      <Field name="password" label="Password" errors={state.errors?.password}>
        {(props) => <PasswordInput {...props} autoComplete="current-password" required />}
      </Field>

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/forgot-password"
          className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Forgot your password?
        </Link>
        <Link
          href="/register"
          className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          Create an account
        </Link>
      </div>
    </form>
  );
}
