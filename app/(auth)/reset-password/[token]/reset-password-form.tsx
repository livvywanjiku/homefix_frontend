"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { resetPasswordAction } from "../../actions";
import { INITIAL_FORM_STATE } from "../../form-state";

export function ResetPasswordForm({ token, email }: { token: string; email?: string }) {
  const [state, action] = useActionState(resetPasswordAction, INITIAL_FORM_STATE);

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* The token identifies the reset request; it comes from the emailed link
          and is verified by Laravel, not by anything here. */}
      <input type="hidden" name="token" value={token} />

      {state.status === "error" && state.message ? (
        <FormMessage>{state.message}</FormMessage>
      ) : null}

      {/* Prefilled from the link, but editable: if the link was mangled or the
          address differs from the account, the user can correct it rather than
          being stuck on a page that only ever fails. */}
      <Field name="email" label="Email" errors={state.errors?.email}>
        {(props) => (
          <Input
            {...props}
            type="email"
            autoComplete="email"
            defaultValue={email}
            placeholder="you@example.com"
            required
          />
        )}
      </Field>

      <Field
        name="password"
        label="New password"
        hint="At least 8 characters, with letters and numbers."
        errors={state.errors?.password}
      >
        {(props) => (
          <Input {...props} type="password" autoComplete="new-password" required />
        )}
      </Field>

      <Field
        name="password_confirmation"
        label="Confirm new password"
        errors={state.errors?.password_confirmation}
      >
        {(props) => (
          <Input {...props} type="password" autoComplete="new-password" required />
        )}
      </Field>

      <SubmitButton pendingLabel="Resetting…">Set new password</SubmitButton>

      <Link href="/login" className="text-sm underline underline-offset-4">
        Back to sign in
      </Link>
    </form>
  );
}
