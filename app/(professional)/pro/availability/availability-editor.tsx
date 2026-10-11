"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, SubmitButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { FormMessage } from "@/components/ui/form-message";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { formatDate, weekdayName } from "@/lib/format";
import type { AvailabilityDay, AvailabilityException } from "@/lib/types";
import { blockDateAction, saveAvailabilityAction, unblockDateAction } from "../actions";

/** The order the week is shown in — Monday first, which is how Kenya reads it. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT_START = "08:00";
const DEFAULT_END = "17:00";

/**
 * The weekly working pattern and the dates blocked out of it.
 *
 * Two forms rather than one: the week is submitted whole and replaces what is
 * there, while blocking a date is an independent, single-row action. Merging
 * them would mean re-saving the week in order to block a day off.
 */
export function AvailabilityEditor({
  days,
  exceptions,
}: {
  days: AvailabilityDay[];
  exceptions: AvailabilityException[];
}) {
  const [weekState, weekAction] = useActionState(saveAvailabilityAction, INITIAL_FORM_STATE);
  const [blockState, blockAction] = useActionState(blockDateAction, INITIAL_FORM_STATE);

  const byDay = new Map(days.map((day) => [day.day_of_week, day]));

  // Which days are ticked. Held here so the time inputs can be disabled rather
  // than hidden — a disabled field keeps the row's shape, so the grid does not
  // jump as days are toggled.
  const [enabled, setEnabled] = useState<Set<number>>(
    () => new Set(days.map((day) => day.day_of_week)),
  );

  const blockFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (blockState.status !== "success") return;

    blockFormRef.current?.reset();
  }, [blockState]);

  function toggle(day: number, on: boolean) {
    setEnabled((current) => {
      const next = new Set(current);
      if (on) next.add(day);
      else next.delete(day);

      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customers can only book you inside these hours. Block out a single date when you are
          away for the day.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your working week</CardTitle>
        </CardHeader>

        <CardBody>
          <form action={weekAction} className="flex flex-col gap-4">
            {weekState.message ? (
              <FormMessage tone={weekState.status === "success" ? "success" : "error"}>
                {weekState.message}
              </FormMessage>
            ) : null}

            <div className="flex flex-col divide-y divide-line">
              {WEEK.map((day) => {
                const existing = byDay.get(day);
                const on = enabled.has(day);

                return (
                  <div
                    key={day}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 sm:flex-nowrap"
                  >
                    <label className="flex w-40 shrink-0 items-center gap-2.5 text-sm font-medium">
                      <input
                        type="checkbox"
                        name={`day_${day}_enabled`}
                        checked={on}
                        onChange={(event) => toggle(day, event.target.checked)}
                        className="size-4 rounded border-line accent-brand"
                      />
                      {weekdayName(day)}
                    </label>

                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        name={`day_${day}_start`}
                        aria-label={`${weekdayName(day)} start time`}
                        disabled={!on}
                        defaultValue={existing?.start_time.slice(0, 5) ?? DEFAULT_START}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        name={`day_${day}_end`}
                        aria-label={`${weekdayName(day)} finish time`}
                        disabled={!on}
                        defaultValue={existing?.end_time.slice(0, 5) ?? DEFAULT_END}
                        className="w-32"
                      />
                    </div>

                    {weekState.errors?.[`day_${day}_start_time`] ?? weekState.errors?.[`day_${day}_end_time`] ? (
                      <p className="text-xs text-danger">
                        {(weekState.errors?.[`day_${day}_start_time`] ??
                          weekState.errors?.[`day_${day}_end_time`])?.[0]}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              A day you leave unticked is a day you do not work, and it disappears from your
              profile entirely.
            </p>

            <div className="flex justify-end">
              <SubmitButton pendingLabel="Saving…">Save working week</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked dates</CardTitle>
        </CardHeader>

        <CardBody className="flex flex-col gap-5">
          {exceptions.length === 0 ? (
            <EmptyState
              title="No dates blocked"
              description="You have no days off booked in. Block a date when you will not be available."
            />
          ) : (
            <ul className="divide-y divide-line">
              {exceptions.map((exception) => (
                <li key={exception.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(exception.blocked_on)}
                    </p>
                    {exception.reason ? (
                      <p className="text-sm text-muted-foreground">{exception.reason}</p>
                    ) : null}
                  </div>

                  <form action={unblockDateAction}>
                    <input type="hidden" name="id" value={exception.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Unblock
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          <form
            ref={blockFormRef}
            action={blockAction}
            className="flex flex-col gap-4 border-t border-line pt-5"
          >
            {blockState.message ? (
              <FormMessage tone={blockState.status === "success" ? "success" : "error"}>
                {blockState.message}
              </FormMessage>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="blocked_on" label="Date" errors={blockState.errors?.blocked_on}>
                {(props) => <Input {...props} type="date" required />}
              </Field>

              <Field
                name="reason"
                label="Reason"
                hint="Optional. Only you see this."
                errors={blockState.errors?.reason}
              >
                {(props) => <Input {...props} placeholder="Family event" />}
              </Field>
            </div>

            <div className="flex justify-end">
              <SubmitButton variant="secondary" pendingLabel="Blocking…">
                Block this date
              </SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
