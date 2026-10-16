"use client";

import { useActionState, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { EmptyState } from "@/components/ui/empty-state";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { formatMoney } from "@/lib/format";
import type { Offering, Service } from "@/lib/types";
import { deleteOfferingAction, saveOfferingAction } from "../actions";

/**
 * The services a professional offers, and the form that edits them.
 *
 * One form serves both "add" and "edit" rather than two screens: the fields are
 * identical and the only difference is a hidden id, so a separate edit page
 * would be the same markup twice.
 */
export function ServiceManager({
  offerings,
  services,
}: {
  offerings: Offering[];
  services: Service[];
}) {
  const [state, action] = useActionState(saveOfferingAction, INITIAL_FORM_STATE);
  const [editing, setEditing] = useState<Offering | null>(null);
  const [pricingType, setPricingType] = useState<Offering["pricing_type"]>("quote");

  // Bumped whenever the form should come back empty. Folded into the inputs'
  // key so React remounts them with their defaults rather than leaving the
  // submitted values behind — which reads as though the save did not happen.
  const [formVersion, setFormVersion] = useState(0);

  /*
   * Clears the form after a successful save.
   *
   * `useActionState` hands back a fresh object for every dispatch, so a change
   * of identity is precisely "an action just completed". Adjusting state during
   * render — React's documented alternative to an effect for exactly this — is
   * used because an effect would render the stale form once more first, and
   * because a synchronous `setState` inside an effect triggers a cascading
   * render that the lint rules reject on sight.
   */
  const [seen, setSeen] = useState(state);

  if (state !== seen) {
    setSeen(state);

    if (state.status === "success") {
      setEditing(null);
      setPricingType("quote");
      setFormVersion((version) => version + 1);
    }
  }

  /** Loads an offering into the form, including its pricing type. */
  function edit(offering: Offering | null) {
    setEditing(offering);
    setPricingType(offering?.pricing_type ?? "quote");
    setFormVersion((version) => version + 1);
  }

  const fieldKey = `${editing?.id ?? "new"}-${formVersion}`;

  // Only for scrolling the editor into view when "Edit" is pressed on a row
  // further down the page — the form itself is uncontrolled.
  const formRef = useRef<HTMLDivElement>(null);

  const takenServiceIds = new Set(offerings.map((offering) => offering.service_id));

  const selectableServices = services.filter(
    (service) => !takenServiceIds.has(service.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your services</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each service you add is another way for customers to find you. Prices are a starting
          point — you can still quote on inspection.
        </p>
      </div>

      {offerings.length === 0 ? (
        <EmptyState
          title="You have not added any services yet"
          description="Add the work you do. Customers search by service, so this is what puts you in front of them."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {offerings.map((offering) => (
            <li key={offering.id}>
              <Card>
                <CardBody className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                      {offering.service?.name ?? `Service #${offering.service_id}`}
                      {offering.service?.category ? (
                        <span className="text-sm font-normal text-muted-foreground">
                          {offering.service.category.name}
                        </span>
                      ) : null}
                      {offering.is_active ? null : <Badge tone="neutral">Hidden</Badge>}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {offering.pricing_label}
                      {offering.pricing_type === "quote"
                        ? " · priced after inspection"
                        : ` · from ${formatMoney(offering.price_min_cents)}${
                            offering.price_max_cents
                              ? ` to ${formatMoney(offering.price_max_cents)}`
                              : ""
                          }`}
                    </p>

                    {offering.description ? (
                      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        {offering.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        edit(offering);
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Edit
                    </Button>

                    {/* A form of its own — a nested form is not valid HTML, and
                        removing is a state change that must not be a plain link. */}
                    <form action={deleteOfferingAction}>
                      <input type="hidden" name="id" value={offering.id} />
                      <Button type="submit" variant="danger" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card ref={formRef}>
        <CardHeader>
          <CardTitle>{editing ? "Edit offering" : "Add a service"}</CardTitle>

          {editing ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => edit(null)}>
              Cancel editing
            </Button>
          ) : null}
        </CardHeader>

        <CardBody>
          <form action={action} className="flex flex-col gap-4">
            {state.message ? (
              <FormMessage tone={state.status === "success" ? "success" : "error"}>
                {state.message}
              </FormMessage>
            ) : null}

            {/* Keyed on the row being edited so the uncontrolled inputs below
                pick up its values instead of keeping the previous row's. */}
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            {editing ? (
              /*
               * The service is fixed once chosen: an offering is the join
               * between this professional and one catalogue entry, and the
               * update endpoint refuses a changed `service_id` outright. Shown
               * read-only so it is clear what is being edited.
               */
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Service</span>
                <p className="text-sm text-muted-foreground">
                  {editing.service?.name ?? `Service #${editing.service_id}`}
                  <span className="ml-2 text-xs">
                    (remove this offering to change the service)
                  </span>
                </p>
              </div>
            ) : (
              <Field name="service_id" label="Service" errors={state.errors?.service_id}>
                {(props) => (
                  <Select {...props} defaultValue="">
                    <option key="choose-a-service" value="">Choose a service…</option>
                    {selectableServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.category ? `${service.category.name} · ` : ""}
                        {service.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}

            <Field
              name="description"
              label="How you describe this work"
              hint="Optional. Say what is included, or what makes your price what it is."
              errors={state.errors?.description}
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={3}
                  key={fieldKey}
                  defaultValue={editing?.description ?? ""}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field name="pricing_type" label="How you price it" errors={state.errors?.pricing_type}>
                {(props) => (
                  <Select
                    {...props}
                    key={fieldKey}
                    value={pricingType}
                    onChange={(event) =>
                      setPricingType(event.target.value as Offering["pricing_type"])
                    }
                  >
                    <option key="fixed" value="fixed">Fixed price</option>
                    <option key="hourly" value="hourly">Hourly rate</option>
                    <option key="quote" value="quote">Quote on inspection</option>
                  </Select>
                )}
              </Field>

              {/* Hidden for quote-only work: a price that does not apply would
                  be rejected by the API, so showing the field would only invite
                  a validation error. */}
              {pricingType === "quote" ? null : (
                <>
                  <Field
                    name="price_min"
                    label="From (KSh)"
                    errors={state.errors?.price_min}
                  >
                    {(props) => (
                      <Input
                        {...props}
                        type="number"
                        min={0}
                        step={50}
                        key={fieldKey}
                        defaultValue={
                          editing?.price_min_cents ? editing.price_min_cents / 100 : ""
                        }
                        required
                      />
                    )}
                  </Field>

                  <Field
                    name="price_max"
                    label="Up to (KSh)"
                    hint="Optional."
                    errors={state.errors?.price_max}
                  >
                    {(props) => (
                      <Input
                        {...props}
                        type="number"
                        min={0}
                        step={50}
                        key={fieldKey}
                        defaultValue={
                          editing?.price_max_cents ? editing.price_max_cents / 100 : ""
                        }
                      />
                    )}
                  </Field>
                </>
              )}
            </div>

            <Checkbox
              name="is_active"
              label="Show this service to customers"
              key={fieldKey}
              defaultChecked={editing ? editing.is_active : true}
            />

            <div className="flex justify-end">
              <SubmitButton pendingLabel="Saving…">
                {editing ? "Save changes" : "Add service"}
              </SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
