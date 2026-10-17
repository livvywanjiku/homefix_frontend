"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { AuthUser } from "@/lib/types";
import { saveAccountAction } from "./actions";

/**
 * The customer's own details.
 *
 * A client component because `useActionState` is what keeps the typed values on
 * a failed submit — Laravel's uniqueness refusal has to come back onto the
 * phone field rather than wiping the form.
 */
export function AccountForm({ user }: { user: AuthUser }) {
  const [state, action] = useActionState(saveAccountAction, INITIAL_FORM_STATE);

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message ? (
        <FormMessage tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FormMessage>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>

        <CardBody className="flex flex-col gap-4">
          <Field
            name="name"
            label="Full name"
            errors={state.errors?.name}
            hint="Professionals see this name on your job postings."
          >
            {(props) => (
              <Input {...props} defaultValue={user.name} autoComplete="name" />
            )}
          </Field>

          <Field
            name="phone"
            label="Mobile number"
            errors={state.errors?.phone}
            hint="Shared with the professional only after you accept their quote."
          >
            {(props) => (
              <Input
                {...props}
                type="tel"
                defaultValue={user.phone ?? ""}
                autoComplete="tel"
                placeholder="+254 712 345 678"
              />
            )}
          </Field>

          <div>
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
