"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { Location, ProfessionalProfile } from "@/lib/types";
import { saveProfileAction } from "../actions";

/**
 * The profile editor.
 *
 * A client component because `useActionState` is the only way to keep the
 * entered values on a failed submit — the alternative, letting the action
 * `redirect()` back with query-string errors, would lose everything the
 * professional had typed.
 */
export function ProfileForm({
  profile,
  locations,
}: {
  profile: ProfessionalProfile | null;
  locations: Location[];
}) {
  const [state, action] = useActionState(saveProfileAction, INITIAL_FORM_STATE);

  const selectedAreas = new Set(profile?.service_areas.map((area) => area.id) ?? []);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.message ? (
        <FormMessage tone={state.status === "success" ? "success" : "error"}>
          {state.message}
        </FormMessage>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>About your business</CardTitle>
        </CardHeader>

        <CardBody className="flex flex-col gap-4">
          <Field name="business_name" label="Business or trading name" errors={state.errors?.business_name}>
            {(props) => (
              <Input
                {...props}
                defaultValue={profile?.business_name ?? ""}
                placeholder="e.g. Otieno Plumbing Services"
                autoComplete="organization"
              />
            )}
          </Field>

          <Field
            name="about"
            label="About you"
            hint="What you do, how long you have done it, and what customers can expect."
            errors={state.errors?.about}
          >
            {(props) => (
              <Textarea
                {...props}
                rows={5}
                defaultValue={profile?.about ?? ""}
                placeholder="I am a licensed electrician with 12 years of experience across Nakuru and Njoro…"
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="experience_years"
              label="Years of experience"
              hint="Leave blank if you would rather not say."
              errors={state.errors?.experience_years}
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0}
                  max={70}
                  defaultValue={profile?.experience_years ?? ""}
                />
              )}
            </Field>

            <Field
              name="phone"
              label="Business phone"
              hint="Shared with a customer only once you take on their job."
              errors={state.errors?.phone}
            >
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  defaultValue={profile?.phone ?? ""}
                  placeholder="0712 345 678"
                  autoComplete="tel"
                />
              )}
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where you work</CardTitle>
        </CardHeader>

        <CardBody className="flex flex-col gap-5">
          <Field
            name="base_location_id"
            label="Town you work from"
            hint="Used to work out how far away you are from a customer."
            errors={state.errors?.base_location_id}
          >
            {(props) => (
              <Select {...props} defaultValue={profile?.base_location?.id ?? ""}>
                <option value="">Choose a town…</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Other towns you cover</legend>
            <p className="text-xs text-muted-foreground">
              Your base town is always included. Tick any others you are willing to travel to.
            </p>

            {/*
             * A bounded, scrollable list rather than a multi-select: a native
             * multi-select needs a modifier key to add a second choice, which
             * is a poor affordance on the phones this is mostly used from.
             */}
            <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <Checkbox
                  key={location.id}
                  name="service_area_ids"
                  value={location.id}
                  label={location.label}
                  defaultChecked={selectedAreas.has(location.id)}
                />
              ))}
            </div>

            {state.errors?.service_area_ids ? (
              <p className="text-xs text-danger">{state.errors.service_area_ids[0]}</p>
            ) : null}
          </fieldset>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}
