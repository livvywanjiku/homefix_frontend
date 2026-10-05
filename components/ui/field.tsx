import type { ComponentProps, ReactNode } from "react";

type ControlProps = {
  id: string;
  name: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

/**
 * A labelled form control with its hint and validation message.
 *
 * The control is a render prop so the `id`/`aria-*` wiring cannot drift from
 * the label and error text — the caller receives the attributes rather than
 * being trusted to repeat them. Only the first error is shown; a field with
 * three messages stacked under it reads as noise.
 */
export function Field({
  name,
  label,
  errors,
  hint,
  children,
}: {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const hasError = Boolean(errors?.length);
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  const describedBy =
    [hint && !hasError ? hintId : null, hasError ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>

      {children({
        id: name,
        name,
        "aria-invalid": hasError,
        "aria-describedby": describedBy,
      })}

      {hint && !hasError ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {hasError ? (
        <p id={errorId} className="text-xs text-danger">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "w-full rounded-lg border border-line bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-brand/50 focus:ring-2 focus:ring-brand/15 aria-[invalid=true]:border-danger/60 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${CONTROL} h-11 ${className}`} />;
}

export function Textarea({
  className = "",
  rows = 4,
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea {...props} rows={rows} className={`${CONTROL} py-2.5 ${className}`} />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: ComponentProps<"select">) {
  return (
    <select {...props} className={`${CONTROL} h-11 pr-8 ${className}`}>
      {children}
    </select>
  );
}

/**
 * A checkbox with its label beside it.
 *
 * Not a `Field` render-prop: a checkbox's label sits alongside the control
 * rather than above it, and the whole pair needs to be one click target.
 */
export function Checkbox({
  name,
  label,
  errors,
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string; errors?: string[] }) {
  const errorId = `${name}-error`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={name} className="flex items-center gap-2.5 text-sm">
        <input
          {...props}
          id={name}
          name={name}
          type="checkbox"
          aria-invalid={Boolean(errors?.length)}
          aria-describedby={errors?.length ? errorId : undefined}
          className="size-4 rounded border-line text-brand accent-brand focus:ring-2 focus:ring-brand/20"
        />
        {label}
      </label>

      {errors?.length ? (
        <p id={errorId} className="text-xs text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A file input styled to match the other controls.
 *
 * `accept` is a hint to the picker only; the server must still validate the
 * mime type and size, which is why callers pass both and Laravel re-checks.
 */
export function FileInput({
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      {...props}
      type="file"
      className={`${CONTROL} h-11 cursor-pointer py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-50/70 dark:file:bg-brand/20 dark:file:text-brand-50 ${className}`}
    />
  );
}
