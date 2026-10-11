"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Field, FileInput, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { formatDate } from "@/lib/format";
import type { Location, PortfolioItem, Service } from "@/lib/types";
import {
  deletePortfolioImageAction,
  deletePortfolioItemAction,
  savePortfolioItemAction,
  uploadPortfolioImagesAction,
} from "../actions";

/** One item's photo strip and its upload control. */
function ItemPhotos({ item }: { item: PortfolioItem }) {
  const [state, action] = useActionState(uploadPortfolioImagesAction, INITIAL_FORM_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <div className="border-t border-line px-5 py-4">
      {item.images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos yet. Jobs with photos get noticeably more enquiries.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {item.images.map((image) => (
            <li key={image.id} className="relative">
              <div className="relative size-24 overflow-hidden rounded-lg border border-line">
                {image.url === null ? (
                  <div className="flex size-full items-center justify-center px-1 text-center text-xs text-muted-foreground">
                    No preview
                  </div>
                ) : (
                  <Image
                    src={image.url}
                    alt={image.caption ?? item.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                )}
              </div>

              {image.is_cover ? (
                <span className="absolute -top-2 -left-2">
                  <Badge tone="brand">Cover</Badge>
                </span>
              ) : null}

              {/* Outside the thumbnail's link so it is not a nested interactive
                  element, and a form because deleting changes server state. */}
              <form action={deletePortfolioImageAction} className="mt-1.5">
                <input type="hidden" name="item_id" value={item.id} />
                <input type="hidden" name="image_id" value={image.id} />
                <Button type="submit" variant="ghost" size="sm" className="w-full">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={item.id} />

        <div className="min-w-56 flex-1">
          <Field name={`images-${item.id}`} label="Add photos" errors={state.errors?.images}>
            {(props) => (
              <FileInput
                {...props}
                name="images"
                multiple
                accept="image/jpeg,image/png,image/webp"
              />
            )}
          </Field>
        </div>

        <SubmitButton variant="secondary" pendingLabel="Uploading…">
          Upload
        </SubmitButton>
      </form>

      {state.message ? (
        <div className="mt-3">
          <FormMessage tone={state.status === "success" ? "success" : "error"}>
            {state.message}
          </FormMessage>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The portfolio: completed jobs, each with photos.
 *
 * Deliberately manual rather than harvested from completed bookings — a
 * professional should choose what represents their work, and the first few jobs
 * on a new account are rarely the ones they would pick.
 */
export function PortfolioManager({
  items,
  services,
  locations,
}: {
  items: PortfolioItem[];
  services: Service[];
  locations: Location[];
}) {
  const [state, action] = useActionState(savePortfolioItemAction, INITIAL_FORM_STATE);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);

  // Bumped when the form should come back empty; see the note in ServiceManager
  // for why this is State-during-render rather than an effect.
  const [formVersion, setFormVersion] = useState(0);
  const [seen, setSeen] = useState(state);

  if (state !== seen) {
    setSeen(state);

    if (state.status === "success") {
      setEditing(null);
      setFormVersion((version) => version + 1);
    }
  }

  function edit(item: PortfolioItem | null) {
    setEditing(item);
    setFormVersion((version) => version + 1);
  }

  const fieldKey = `${editing?.id ?? "new"}-${formVersion}`;

  const formRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Show customers the work you have done. Photos carry more weight than anything else on
          your profile.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Your portfolio is empty"
          description="Add a job you are proud of, with a photo or two. You can leave out the customer's name."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {item.cover_url ? (
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-line">
                        <Image
                          src={item.cover_url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : null}

                    <div>
                      <CardTitle as="h3" className="flex items-center gap-2">
                        {item.title}
                        {item.is_published ? null : <Badge tone="neutral">Draft</Badge>}
                      </CardTitle>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {[
                          item.service?.name,
                          item.location?.name,
                          item.completed_on ? formatDate(item.completed_on) : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No details added"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        edit(item);
                        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      Edit
                    </Button>

                    <form action={deletePortfolioItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="danger" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                </CardHeader>

                {item.description ? (
                  <CardBody className="text-sm text-muted-foreground">{item.description}</CardBody>
                ) : null}

                <ItemPhotos item={item} />
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card ref={formRef}>
        <CardHeader>
          <CardTitle>{editing ? "Edit job" : "Add a job"}</CardTitle>

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

            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            <Field name="title" label="Job title" errors={state.errors?.title}>
              {(props) => (
                <Input
                  {...props}
                  key={fieldKey}
                  defaultValue={editing?.title ?? ""}
                  placeholder="e.g. Full kitchen rewiring in Milimani"
                />
              )}
            </Field>

            <Field
              name="description"
              label="What the job involved"
              hint="Optional, but a sentence or two helps customers judge whether you have done this before."
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
              <Field name="service_id" label="Service" errors={state.errors?.service_id}>
                {(props) => (
                  <Select {...props} key={fieldKey} defaultValue={editing?.service?.id ?? ""}>
                    <option value="">Not specified</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field name="location_id" label="Town" errors={state.errors?.location_id}>
                {(props) => (
                  <Select {...props} key={fieldKey} defaultValue={editing?.location?.id ?? ""}>
                    <option value="">Not specified</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                name="completed_on"
                label="Completed on"
                hint="Optional."
                errors={state.errors?.completed_on}
              >
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    key={fieldKey}
                    defaultValue={editing?.completed_on ?? ""}
                  />
                )}
              </Field>
            </div>

            <Checkbox
              name="is_published"
              label="Show this job on my public profile"
              key={fieldKey}
              defaultChecked={editing ? editing.is_published : true}
            />

            <div className="flex justify-end">
              <SubmitButton pendingLabel="Saving…">
                {editing ? "Save changes" : "Add job"}
              </SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
