"use client";

import { useActionState, useRef, useState } from "react";
import { Button, SubmitButton } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { Quotation } from "@/lib/types";
import { saveQuotationAction } from "../actions";

const CATEGORIES = [
  { value: "labour", label: "Labour" },
  { value: "materials", label: "Materials" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
] as const;

type Row = {
  key: string;
  category: string;
  description: string;
  quantity: string;
  unit_price: string;
};

/**
 * One editable line of the breakdown.
 *
 * Prices are typed in whole shillings because nobody quotes in cents; the
 * server action converts once, through the same schema the API's contract is
 * written against.
 */
function initialRows(quotation?: Quotation): Row[] {
  if (!quotation || quotation.items.length === 0) {
    return [{ key: "initial-0", category: "labour", description: "", quantity: "1", unit_price: "" }];
  }

  return quotation.items.map((item, index) => ({
    key: `initial-${item.id ?? index}`,
    category: item.category,
    description: item.description,
    quantity: String(item.quantity),
    unit_price: String(item.unit_price_cents / 100),
  }));
}

/**
 * The quote form (spec §9).
 *
 * A professional prices the job line by line: labour, materials and transport
 * are separated because that is how the customer compares two offers. The
 * inputs are controlled rather than defaulted so a validation failure does not
 * wipe a long breakdown — React 19 resets an uncontrolled form after its action
 * completes.
 *
 * One component serves both "send" and "revise": the only differences are the
 * hidden quotation id and the button's wording.
 */
export function QuotationForm({
  serviceRequestId,
  quotation,
}: {
  serviceRequestId: number;
  quotation?: Quotation;
}) {
  const [state, action] = useActionState(saveQuotationAction, INITIAL_FORM_STATE);
  const [rows, setRows] = useState<Row[]>(() => initialRows(quotation));
  const [message, setMessage] = useState(quotation?.message ?? "");
  const [estimatedDays, setEstimatedDays] = useState(
    quotation?.estimated_days === null || quotation?.estimated_days === undefined
      ? ""
      : String(quotation.estimated_days),
  );
  const [availableFrom, setAvailableFrom] = useState(quotation?.available_from?.slice(0, 10) ?? "");
  const [validUntil, setValidUntil] = useState(quotation?.valid_until?.slice(0, 10) ?? "");

  const nextKey = useRef(0);
  const errors = state.errors ?? {};

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) =>
      current.map((row, position) => (position === index ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    nextKey.current += 1;
    setRows((current) => [
      ...current,
      {
        key: `new-${nextKey.current}`,
        category: "labour",
        description: "",
        quantity: "1",
        unit_price: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, position) => position !== index));
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="service_request_id" value={serviceRequestId} />
      {quotation ? <input type="hidden" name="id" value={quotation.id} /> : null}

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      {state.status === "success" && state.message ? (
        <FormMessage tone="success">{state.message}</FormMessage>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-medium">Your price</h3>
          <p className="text-xs text-muted-foreground">
            Prices are in KSh. The platform totals each line and the quote.
          </p>
        </div>

        {rows.map((row, index) => (
          <div
            key={row.key}
            className="grid gap-3 rounded-lg border border-line bg-surface/40 p-3 sm:grid-cols-[8.5rem_1fr_6rem_7rem_auto] sm:items-start"
          >
            <Field name={`category_${index}`} label="Type" errors={errors[`category_${index}`]}>
              {(props) => (
                <Select
                  {...props}
                  value={row.category}
                  onChange={(event) => updateRow(index, { category: event.target.value })}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              name={`description_${index}`}
              label="What it covers"
              errors={errors[`description_${index}`]}
            >
              {(props) => (
                <Input
                  {...props}
                  value={row.description}
                  maxLength={150}
                  placeholder="Replace the joint and reseal"
                  onChange={(event) => updateRow(index, { description: event.target.value })}
                />
              )}
            </Field>

            <Field name={`quantity_${index}`} label="Qty" errors={errors[`quantity_${index}`]}>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={0.01}
                  step="any"
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(event) => updateRow(index, { quantity: event.target.value })}
                />
              )}
            </Field>

            <Field
              name={`unit_price_${index}`}
              label="Price each"
              errors={errors[`unit_price_${index}`]}
            >
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min={1}
                  step={100}
                  inputMode="numeric"
                  value={row.unit_price}
                  placeholder="1500"
                  onChange={(event) => updateRow(index, { unit_price: event.target.value })}
                />
              )}
            </Field>

            <div className="flex items-end sm:h-11">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                aria-label={`Remove line ${index + 1}`}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}

        {errors.items?.length ? <p className="text-xs text-danger">{errors.items[0]}</p> : null}

        <div>
          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            Add another line
          </Button>
        </div>
      </div>

      <Field
        name="message"
        label="A note for the customer"
        errors={errors.message}
        hint="What the price includes, and anything it assumes — access, parts, or a second visit."
      >
        {(props) => (
          <Textarea
            {...props}
            rows={4}
            maxLength={2000}
            value={message}
            placeholder="Includes replacing the joint and resealing. Assumes the stopcock works; if not, a replacement is KSh 2,000 more."
            onChange={(event) => setMessage(event.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="estimated_days"
          label="Working days"
          errors={errors.estimated_days}
          hint="Optional. How many days the job takes."
        >
          {(props) => (
            <Input
              {...props}
              type="number"
              min={1}
              max={365}
              inputMode="numeric"
              value={estimatedDays}
              placeholder="2"
              onChange={(event) => setEstimatedDays(event.target.value)}
            />
          )}
        </Field>

        <Field
          name="available_from"
          label="Can start"
          errors={errors.available_from}
          hint="Optional. A date in the past is refused."
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              value={availableFrom}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setAvailableFrom(event.target.value)}
            />
          )}
        </Field>

        <Field
          name="valid_until"
          label="Price valid until"
          errors={errors.valid_until}
          hint="Optional. Must be after today."
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              value={validUntil}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          )}
        </Field>
      </div>

      <div>
        <SubmitButton pendingLabel={quotation ? "Saving…" : "Sending…"}>
          {quotation ? "Save changes" : "Send this quote"}
        </SubmitButton>
      </div>
    </form>
  );
}
