import type { SVGProps } from "react";

/**
 * A tool glyph for each service category.
 *
 * The catalogue's `icon` column holds an emoji, and an emoji is a font: it
 * renders as whatever the reader's operating system draws, in the reader's
 * operating system's art style, at the reader's operating system's weight. In a
 * grid of fifteen cards that is fifteen different illustrators, and on a
 * platform whose brand is a specific navy-and-orange it is the one part of the
 * page nobody chose. These are stroked paths instead, in the same 24×24,
 * `currentColor`, 1.7-weight style as the console's own set — so a category
 * card takes its colour from the card and its weight from the type beside it.
 *
 * Keyed by category slug (`Str::slug()` of the name in `CatalogueSeeder`),
 * which is the stable identifier: a category's name is editorial and may be
 * reworded, its slug is what its URL is built from. A slug with no glyph here —
 * a category added in the console after this was written — falls back to the
 * generic wrench rather than to nothing, so a new category is plain rather than
 * broken.
 *
 * The emoji are deliberately left in the database. They are still what the
 * admin console edits and what an API consumer receives; this is only how the
 * public catalogue chooses to draw them.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 30, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ── The glyphs ────────────────────────────────────────────────────────── */

const GLYPHS: Record<string, React.ReactNode> = {
  /* A drop: the trade is water, and it survives being drawn at 24px. */
  plumbing: <path d="M12 3.2c3.3 3.7 5.2 6.5 5.2 8.8a5.2 5.2 0 0 1-10.4 0c0-2.3 1.9-5.1 5.2-8.8Z" />,

  electrical: <path d="M13.4 3 5.6 13.4h4.9l-1 7.6 7.9-10.4h-5l1-7.6Z" />,

  cleaning: (
    <>
      <path d="M9.6 8.6h4l1.4 2.9v8.9a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-8.9l1.6-2.9Z" />
      <path d="M10.1 8.6V5.1h3.4" />
      <path d="M13.5 5.1H18" />
      <path d="M16.9 3.1h.01M19.4 6.1h.01M16.9 8.7h.01" />
    </>
  ),

  carpentry: (
    <>
      <path d="M14 3.4 20.6 10 18 12.6 11.4 6 14 3.4Z" />
      <path d="M12.7 7.1 4.7 15.1a2.4 2.4 0 1 0 3.4 3.4l8-8" />
    </>
  ),

  painting: (
    <>
      <rect x="3.4" y="3.8" width="12.2" height="5.2" rx="1.6" />
      <path d="M15.6 6.4h3a1.6 1.6 0 0 1 1.6 1.6v2.8a1.6 1.6 0 0 1-1.6 1.6H12" />
      <path d="M12 12.4v3.2" />
      <rect x="9.9" y="15.6" width="4.2" height="5" rx="1.2" />
    </>
  ),

  gardening: (
    <>
      <path d="M20 3.8c0 9.1-4.6 14.2-11.7 14.2H6.6C6.6 8.9 11.2 3.8 20 3.8Z" />
      <path d="M3.6 20.4 12 12" />
    </>
  ),

  "appliance-repair": (
    <>
      <path d="M9.2 3.2v4.6M14.8 3.2v4.6" />
      <path d="M6.2 7.8h11.6v3.1a5.8 5.8 0 0 1-11.6 0V7.8Z" />
      <path d="M12 16.7v4.1" />
    </>
  ),

  /* Staggered joints, so it reads as a wall and not as a grid. */
  masonry: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.2" />
      <path d="M3 12h18" />
      <path d="M9 5v7M15.5 5v7" />
      <path d="M6.5 12v7M12 12v7M18 12v7" />
    </>
  ),

  roofing: (
    <>
      <path d="M2.6 12 12 3.4 21.4 12" />
      <path d="M6 10.4V20h12v-9.6" />
      <path d="M10 20v-4.6h4V20" />
    </>
  ),

  "pest-control": (
    <>
      <ellipse cx="12" cy="13.8" rx="4.6" ry="5.6" />
      <path d="M12 8.2v11.2" />
      <path d="M9.6 7.4 8 3.8M14.4 7.4 16 3.8" />
      <path d="M7.4 11.4 3.6 9.6M7.4 15.2H3.4M8.6 18.8 5.6 20.8" />
      <path d="M16.6 11.4l3.8-1.8M16.6 15.2h4M15.4 18.8l3 2" />
    </>
  ),

  moving: (
    <>
      <path d="M3.4 7.6 12 3l8.6 4.6v8.8L12 21l-8.6-4.6V7.6Z" />
      <path d="M3.4 7.6 12 12.2l8.6-4.6M12 12.2V21" />
    </>
  ),

  laundry: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 8h16" />
      <circle cx="12" cy="14.4" r="4" />
      <path d="M6.6 5.5h.01M9.6 5.5h.01" />
    </>
  ),

  "air-conditioning": (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
      <path d="M12 3 9.6 5.4M12 3l2.4 2.4M12 21l-2.4-2.4M12 21l2.4-2.4" />
    </>
  ),

  /* A shield with a padlock: the trade, then what it is for. */
  "security-systems": (
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z" />
      <path d="M9.6 12.4v-1.9a2.4 2.4 0 0 1 4.8 0v1.9" />
      <rect x="8.4" y="12.4" width="7.2" height="5" rx="1.5" />
    </>
  ),

  "general-maintenance": (
    <path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4l9-9a4 4 0 0 0-1-1Z" />
  ),
};

/** What a category with no glyph of its own falls back to. */
const FALLBACK = GLYPHS["general-maintenance"];

/**
 * The glyph for a category slug, or the generic one when the slug is unknown.
 *
 * `className` is how the caller colours it — the glyph inherits `currentColor`,
 * so `text-brand` on the wrapper is all it takes.
 */
export function ServiceIcon({
  slug,
  ...props
}: IconProps & { slug: string | null | undefined }) {
  return <Svg {...props}>{(slug ? GLYPHS[slug] : null) ?? FALLBACK}</Svg>;
}
