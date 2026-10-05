const SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
} as const;

/**
 * A five-star rating display.
 *
 * Renders as text rather than an image or icon font so it stays crisp and
 * screen readers announce something meaningful. The numeric value is exposed
 * once via `aria-label`; the stars themselves are hidden from assistive tech,
 * since "four point eight" is the fact and the glyphs are decoration.
 */
export function RatingStars({
  value,
  count,
  size = "md",
  className = "",
}: {
  value: number | null;
  count?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (value === null || count === 0) {
    return (
      <span className={`${SIZES[size]} text-muted-foreground ${className}`}>
        No reviews yet
      </span>
    );
  }

  // Rounded to the nearest half so a 4.6 shows four filled stars and a half.
  const rounded = Math.round(value * 2) / 2;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`${SIZES[size]} tracking-tight text-accent`}
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5`}
      >
        <span aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star}>
              {rounded >= star ? "★" : rounded >= star - 0.5 ? "⯨" : "☆"}
            </span>
          ))}
        </span>
      </span>

      <span className={`${SIZES[size]} font-medium text-foreground`}>
        {value.toFixed(1)}
      </span>

      {count !== undefined ? (
        <span className={`${SIZES[size]} text-muted-foreground`}>({count})</span>
      ) : null}
    </span>
  );
}

/**
 * A star input for the review form (spec §14).
 *
 * A radio group rather than five buttons: it is one value with five mutually
 * exclusive choices, which is exactly what radios model, and it gets keyboard
 * arrow navigation for free.
 */
export function RatingInput({
  name,
  label,
  errors,
}: {
  name: string;
  label: string;
  errors?: string[];
}) {
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <fieldset
      aria-invalid={hasError}
      aria-describedby={hasError ? errorId : undefined}
      className="flex flex-col gap-1.5"
    >
      <legend className="text-sm font-medium">{label}</legend>

      <div className="flex flex-row-reverse justify-end gap-1">
        {[5, 4, 3, 2, 1].map((rating) => (
          <label
            key={rating}
            className="cursor-pointer text-2xl text-line transition-colors has-checked:text-accent hover:text-accent"
          >
            <input
              type="radio"
              name={name}
              value={rating}
              required
              className="peer sr-only"
            />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{rating} out of 5</span>
          </label>
        ))}
      </div>

      {hasError ? (
        <p id={errorId} className="text-xs text-danger">
          {errors?.[0]}
        </p>
      ) : null}
    </fieldset>
  );
}
