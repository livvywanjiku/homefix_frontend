"use client";

import { useActionState, useState, type ReactNode } from "react";
import { SubmitButton } from "@/components/ui/button";
import { Field, FileInput, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
import type { Location, Service, ServiceRequest } from "@/lib/types";

/** The urgency options, worded as a customer would say them. */
const URGENCY = [
  { value: "flexible", label: "Flexible — whenever suits" },
  { value: "soon", label: "Soon — within a week" },
  { value: "urgent", label: "Urgent — today or tomorrow" },
];

const TIME_SLOTS = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

/** Whole shillings, from the minor units the API stores. */
function shillings(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : String(cents / 100);
}

/**
 * The service-request form (spec §8).
 *
 * One page rather than a multi-step wizard, with the fields grouped into the
 * order a customer thinks in. A wizard would have to hold half-finished input in
 * client state, which breaks the browser's back button, refresh and autofill for
 * no gain the sections do not already give.
 *
 * The photos travel with the create call, so the whole request is one step.
 */
export function RequestForm({
  action,
  services,
  locations,
  request,
  defaultServiceId,
  defaultLocationId,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  services: Service[];
  locations: Location[];
  /** Present when editing an open request; absent when posting a new one. */
  request?: ServiceRequest;
  /** Carried in from a link — a service page, or a professional's profile. */
  defaultServiceId?: number | null;
  defaultLocationId?: number | null;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM_STATE);

  const errors = state.errors ?? {};
  const editing = request !== undefined;

  const serviceId = request?.service?.id ?? defaultServiceId ?? "";
  const locationId = request?.location?.id ?? defaultLocationId ?? "";

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {editing ? <input type="hidden" name="id" value={request.id} /> : null}

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      <Section step={1} title="The job">
        <Field name="service_id" label="Which service do you need?" errors={errors.service_id}>
          {(props) => (
            <Select {...props} defaultValue={serviceId} required>
              <option key="choose-a-service" value="" disabled>
                Choose a service
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.category ? `${service.category.name} · ${service.name}` : service.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          name="title"
          label="Give it a short title"
          errors={errors.title}
          hint="This is the first thing professionals see — “Burst pipe under the kitchen sink”."
        >
          {(props) => (
            <Input
              {...props}
              defaultValue={request?.title ?? ""}
              maxLength={150}
              placeholder="Burst pipe under the kitchen sink"
              required
            />
          )}
        </Field>

        <Field
          name="description"
          label="Describe the job"
          errors={errors.description}
          hint="What is wrong, how long it has been like that, and anything a professional should bring."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={6}
              defaultValue={request?.description ?? ""}
              maxLength={5000}
              placeholder="The pipe under the kitchen sink has been dripping for a week and the cabinet floor is now soaked. I think the joint needs replacing."
              required
            />
          )}
        </Field>
      </Section>

      <Section step={2} title="When">
        <Field name="urgency" label="How soon?" errors={errors.urgency}>
          {(props) => (
            <Select {...props} defaultValue={request?.urgency ?? "flexible"} required>
              {URGENCY.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            name="preferred_date"
            label="Preferred date"
            errors={errors.preferred_date}
            hint="Optional. Leave blank to let professionals propose a time."
          >
            {(props) => (
              <Input
                {...props}
                type="date"
                defaultValue={request?.preferred_date?.slice(0, 10) ?? ""}
                min={new Date().toISOString().slice(0, 10)}
              />
            )}
          </Field>

          <Field name="preferred_time_slot" label="Preferred time" errors={errors.preferred_time_slot}>
            {(props) => (
              <Select {...props} defaultValue={request?.preferred_time_slot ?? ""}>
                <option key="any-time" value="">Any time</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Section>

      <Section step={3} title="Where">
        <Field
          name="location_id"
          label="Town"
          errors={errors.location_id}
          hint="Professionals are matched on the town they cover."
        >
          {(props) => (
            <Select {...props} defaultValue={locationId} required>
              <option key="choose-a-town" value="" disabled>
                Choose a town
              </option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          name="address"
          label="Address or landmark"
          errors={errors.address}
          hint="Only professionals who quote on this job can see it."
        >
          {(props) => (
            <Input
              {...props}
              defaultValue={request?.address ?? ""}
              maxLength={255}
              placeholder="Kilimani, off Argwings Kodhek Road, blue gate"
            />
          )}
        </Field>

        <PinPicker
          latitude={request?.latitude ?? null}
          longitude={request?.longitude ?? null}
          errors={errors}
        />

        <Field
          name="instructions"
          label="Access notes"
          errors={errors.instructions}
          hint="Gate codes, parking, whether anyone will be home."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              defaultValue={request?.instructions ?? ""}
              maxLength={2000}
            />
          )}
        </Field>
      </Section>

      <Section step={4} title="Budget">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            name="budget_min"
            label="From (KSh)"
            errors={errors.budget_min}
            hint="Optional. Leave blank if you would rather see quotes first."
          >
            {(props) => (
              <Input
                {...props}
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                defaultValue={shillings(request?.budget_min_cents)}
                placeholder="1500"
              />
            )}
          </Field>

          <Field name="budget_max" label="Up to (KSh)" errors={errors.budget_max}>
            {(props) => (
              <Input
                {...props}
                type="number"
                min={0}
                step={100}
                inputMode="numeric"
                defaultValue={shillings(request?.budget_max_cents)}
                placeholder="5000"
              />
            )}
          </Field>
        </div>
      </Section>

      {editing ? null : (
        <Section step={5} title="Photos">
          <Field
            name="images"
            label="Add up to 5 photos"
            errors={errors.images}
            hint="JPG, PNG or WebP, 4 MB each. A picture saves a lot of back-and-forth."
          >
            {(props) => (
              <FileInput {...props} multiple accept="image/jpeg,image/png,image/webp" />
            )}
          </Field>
        </Section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pendingLabel={editing ? "Saving…" : "Posting…"}>
          {editing ? "Save changes" : "Post this job"}
        </SubmitButton>

        <p className="text-sm text-muted-foreground">
          {editing
            ? "You can edit this until the first professional quotes."
            : "Verified professionals covering your town will see it straight away."}
        </p>
      </div>
    </form>
  );
}

/**
 * A numbered group of fields.
 *
 * The numbers are the whole point: they give the page the sequence a wizard
 * would without any of a wizard's state.
 */
function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="flex items-center gap-3 pb-1">
        <span
          aria-hidden="true"
          className="inline-flex size-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white"
        >
          {step}
        </span>
        <span className="text-lg font-semibold tracking-tight">{title}</span>
      </legend>

      {children}
    </fieldset>
  );
}

/**
 * An optional map pin, taken from the device's own location.
 *
 * There is no map widget yet — that needs a tile provider key — so this asks the
 * browser for coordinates instead, which is enough for the jobs that matter
 * (the customer is standing in the room with the leak). The API refuses a pin
 * with only one coordinate, so both travel together or neither does.
 */
function PinPicker({
  latitude,
  longitude,
  errors,
}: {
  latitude: number | null;
  longitude: number | null;
  errors: Record<string, string[]>;
}) {
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(
    latitude !== null && longitude !== null ? { latitude, longitude } : null,
  );
  const [note, setNote] = useState<string | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setNote("This device cannot share its location. The town and address are enough.");
      return;
    }

    setNote("Finding you…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNote(null);
      },
      () => setNote("Could not get your location. The town and address are enough."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Only sent when a pin exists, so a half-supplied pair can never be posted. */}
      {pin ? (
        <>
          <input type="hidden" name="latitude" value={pin.latitude} />
          <input type="hidden" name="longitude" value={pin.longitude} />
        </>
      ) : null}

      <span className="text-sm font-medium">Pin the exact spot</span>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={pin ? () => { setPin(null); setNote(null); } : locate}
          className="inline-flex h-9 items-center rounded-lg border border-line bg-card px-3.5 text-xs font-medium hover:bg-surface"
        >
          {pin ? "Remove pin" : "Use my current location"}
        </button>

        <span className="text-xs text-muted-foreground">
          {note ??
            (pin
              ? `Pinned at ${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)}`
              : "Optional — helps a professional find you on the day.")}
        </span>
      </div>

      {errors.latitude?.length ? (
        <p className="text-xs text-danger">{errors.latitude[0]}</p>
      ) : null}
    </div>
  );
}
