import type { ReactNode } from "react";

/**
 * The customer dashboard's opening panel.
 *
 * The page used to open on a bare heading, which made the one screen a customer
 * returns to most often look like a settings page. This gives it a wallpaper
 * instead: navy, the brand's own colour for chrome, so the workspace opens the
 * way the public site's header does.
 *
 * The wallpaper is drawn rather than photographed. A bitmap hero would be a
 * file somebody has to license, a `next/image` origin somebody has to
 * allow-list in `next.config.ts`, and a network fetch before the customer's own
 * dashboard appears — for a panel whose content is a greeting and a button. The
 * SVG below ships in the same bundle as the page, weighs nothing next to a
 * photograph, and stays crisp on any display. Swapping in a real photograph
 * later is a change to this one file: replace `<Wallpaper />` with an
 * `<Image fill />` and nothing outside it moves.
 *
 * Navy is used directly rather than through the theme-dependent `--surface`
 * tokens, because this panel is deliberately dark in both colour schemes, the
 * same way the site header is. The text on it is white for that reason, not
 * because it follows `--foreground`.
 */
export function DashboardHero({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-navy px-6 py-8 text-white sm:px-8 sm:py-10">
      <Wallpaper />

      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/60 uppercase">{eyebrow}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">{description}</p>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

/**
 * The wallpaper itself: a blueprint grid, a scatter of trade tools, and two
 * soft glows.
 *
 * The tools are the same glyphs the service catalogue draws — a customer who
 * arrived from `/services` sees the vocabulary they were just browsing, rather
 * than a second set of symbols invented for one panel.
 *
 * `aria-hidden` and `pointer-events-none`: it is decoration, and nothing inside
 * it should be reachable by a screen reader or a click.
 */
function Wallpaper() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/*
        Two soft lights bled off the corners: brand blue from the top right, a
        much fainter amber from the bottom left. The amber is kept low on
        purpose — it is the accent, not a second surface, and over navy a
        stronger wash turns the panel olive rather than warm.
      */}
      <div className="absolute -top-32 -right-24 size-[26rem] rounded-full bg-brand/30 blur-3xl" />
      <div className="absolute -bottom-48 -left-32 size-[22rem] rounded-full bg-accent/10 blur-3xl" />

      <svg className="absolute inset-0 size-full" fill="none" stroke="currentColor">
        <defs>
          {/*
            A 1px grid, faint enough to read as texture. `patternUnits` is on the
            user space of the pattern's own tile, so this scales with nothing and
            stays 40px whatever the panel's size.
          */}
          <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0v40" strokeWidth="1" className="text-white/[0.04]" />
          </pattern>

          {/*
            The tools, tiled at 320×240 and drawn at twice size.

            Both numbers are deliberate. A small, tight tile repeats twelve
            times across a wide panel and stops reading as a wallpaper, becoming
            a texture the eye tries to parse; at this size there are four or
            five repeats and each glyph is large enough to be recognised as the
            tool it is. Six glyphs on a staggered diagonal, so the repeat does
            not line up into visible columns.
          */}
          <pattern id="hero-tools" width="320" height="240" patternUnits="userSpaceOnUse">
            <g
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/[0.07]"
            >
              <g transform="translate(22 26) scale(2)">
                <path d="M2.6 12 12 3.4 21.4 12" />
                <path d="M6 10.4V20h12v-9.6" />
                <path d="M10 20v-4.6h4V20" />
              </g>
              <g transform="translate(152 14) scale(2)">
                <path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 0 1-4-4l9-9a4 4 0 0 0-1-1Z" />
              </g>
              <g transform="translate(252 46) scale(2)">
                <path d="M12 3.2c3.3 3.7 5.2 6.5 5.2 8.8a5.2 5.2 0 0 1-10.4 0c0-2.3 1.9-5.1 5.2-8.8Z" />
              </g>
              <g transform="translate(58 152) scale(2)">
                <path d="M13.4 3 5.6 13.4h4.9l-1 7.6 7.9-10.4h-5l1-7.6Z" />
              </g>
              <g transform="translate(172 164) scale(2)">
                <rect x="3.4" y="3.8" width="12.2" height="5.2" rx="1.6" />
                <path d="M15.6 6.4h3a1.6 1.6 0 0 1 1.6 1.6v2.8a1.6 1.6 0 0 1-1.6 1.6H12" />
                <path d="M12 12.4v3.2" />
                <rect x="9.9" y="15.6" width="4.2" height="5" rx="1.2" />
              </g>
              <g transform="translate(266 146) scale(2)">
                <path d="M20 3.8c0 9.1-4.6 14.2-11.7 14.2H6.6C6.6 8.9 11.2 3.8 20 3.8Z" />
                <path d="M3.6 20.4 12 12" />
              </g>
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#hero-grid)" />
        <rect width="100%" height="100%" fill="url(#hero-tools)" />
      </svg>
    </div>
  );
}
