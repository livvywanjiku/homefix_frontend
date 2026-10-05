const SIZES = {
  sm: "size-9 text-sm",
  md: "size-12 text-base",
  lg: "size-16 text-xl",
} as const;

/**
 * An uploaded avatar, or the user's initials.
 *
 * Deliberately a plain `<img>` and not `next/image`: these are small, they come
 * from Laravel's storage disk, and most accounts have no avatar at all — so the
 * initials fallback is the common path and blocking on an image optimiser would
 * make it the slow one.
 */
export function Avatar({
  src,
  name,
  size = "md",
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see the note above
      <img
        src={src}
        alt={name}
        className={`${SIZES[size]} shrink-0 rounded-full border border-line object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-navy font-medium text-white ${className}`}
    >
      {initials || "?"}
    </span>
  );
}
