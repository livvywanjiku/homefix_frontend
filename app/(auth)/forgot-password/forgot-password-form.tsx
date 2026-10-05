"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { forgotPasswordAction } from "../actions";
import { INITIAL_FORM_STATE } from "../form-state";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, INITIAL_FORM_STATE);

  // Once Laravel has accepted the request there is nothing left to do on this
  // page, so the form is replaced rather than left inviting a second send.
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-5">
        <FormMessage tone="success">{state.message}</FormMessage>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Check your inbox and spam folder. The link expires shortly, and can only be used once.
        </p>

        <Link href="/login" className="text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.status === "error" && state.message ? (
        <FormMessage>{state.message}</FormMessage>
      ) : null}

      <Field
        name="email"
        label="Email"
        hint="We will send a reset link if this address has an account."
        errors={state.errors?.email}
      >
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

      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>

      <Link href="/login" className="text-sm underline underline-offset-4">
        Back to sign in
      </Link>
    </form>
  );
}
