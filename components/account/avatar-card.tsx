"use client";

import { useActionState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { SubmitButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FileInput } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { removeAvatarAction, uploadAvatarAction } from "@/lib/actions/account";

/**
 * The photo card, shared by the customer and professional profile pages.
 *
 * Both roles own a `users` row, so both upload through the same endpoint. The
 * remove form is separate rather than a second submit in the upload form
 * because the two actions mean opposite things and a shared submit button
 * would make the destructive one ambiguous.
 */
export function AvatarCard({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  const [state, action] = useActionState(uploadAvatarAction, INITIAL_FORM_STATE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile photo</CardTitle>
      </CardHeader>

      <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar src={avatarUrl} name={name} size="lg" />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            A clear photo helps customers and professionals recognise you.
          </p>

          <form action={action} className="flex flex-col gap-3">
            {state.message ? (
              <FormMessage tone={state.status === "success" ? "success" : "error"}>
                {state.message}
              </FormMessage>
            ) : null}

            <Field
              name="avatar"
              label="Choose a photo"
              errors={state.errors?.avatar}
              hint="JPG, PNG or WebP, 4 MB."
            >
              {(props) => (
                <FileInput {...props} accept="image/jpeg,image/png,image/webp" />
              )}
            </Field>

            <div>
              <SubmitButton pendingLabel="Uploading…">Upload photo</SubmitButton>
            </div>
          </form>

          {avatarUrl ? (
            <form action={removeAvatarAction}>
              <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…">
                Remove photo
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
