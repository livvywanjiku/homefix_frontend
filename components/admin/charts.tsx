"use client";

import { useId, useState } from "react";
import type { SeriesPoint, SplitSeriesPoint } from "@/lib/admin";
import { formatCompactMoney } from "@/lib/format";

/**
 * The console's charts.
 *
 * Hand-drawn SVG rather than a charting library. The console needs four shapes —
 * a trend line, a bar list, a donut and a stacked column — and every one of them
 * is a few dozen lines of arithmetic; a charting dependency would add a runtime
 * to the client bundle to draw the same paths, and would need to be kept in step
 * with React.
 *
 * Every chart here is fed exclusively by the API. There is no fallback series,
 * no placeholder data and no random jitter: a chart with nothing to draw says so.
 *
 * The hover readout is client-side state, which is why this module is a client
 * component. Nothing it renders is data the browser already had — the points are
 * passed down from a Server Component that fetched them.
 */

const AXIS = "#94a3b8";
const GRID = "#e2e8f0";

/**
 * How a chart writes its numbers.
 *
 * A *name* rather than a callback, because these charts are Client Components
 * drawn by Server Components: React refuses to serialise a function across that
 * boundary, so the server names the format and the chart resolves it here.
 */
export type ChartFormat = "number" | "money";

function formatter(kind: ChartFormat): (value: number) => string {
  return kind === "money" ? formatCompactMoney : (value) => value.toLocaleString();
}

/* ── Trend ─────────────────────────────────────────────────────────────── */

export type TrendChartProps = {
  points: SeriesPoint[];
  /** Rendered above the chart; also the accessible name. */
  title?: string;
  height?: number;
  format?: ChartFormat;
  /** An earlier period's points, drawn as a faint comparison line. */
  comparison?: SeriesPoint[];
  tone?: "accent" | "primary";
  emptyLabel?: string;
};

export function TrendChart({
  points,
  title,
  height = 200,
  format = "number",
  comparison,
  tone = "accent",
  emptyLabel = "No activity in this period.",
}: TrendChartProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const write = formatter(format);

  /*
   * A line of zeroes drawn as a flat line along the bottom is a poor way to say
   * "nothing happened" — it looks like data. An empty period says so instead.
   */
  if (points.length === 0 || points.every((point) => point.value === 0)) {
    return <ChartEmpty height={height} label={emptyLabel} />;
  }

  const width = 720;
  const padding = { top: 16, right: 12, bottom: 26, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const candidates = [...points, ...(comparison ?? [])].map((point) => point.value);
  const rawMax = Math.max(...candidates, 1);
  const max = niceCeiling(rawMax);

  const x = (index: number) =>
    points.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (points.length - 1)) * plotWidth;
  const y = (value: number) => padding.top + plotHeight - (value / max) * plotHeight;

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `${padding.left},${padding.top + plotHeight} ${line} ${padding.left + plotWidth},${padding.top + plotHeight}`;

  const stroke = tone === "primary" ? "var(--color-admin-primary)" : "var(--color-admin-accent)";
  const active = hover ?? null;
  const ticks = [0, 0.5, 1].map((fraction) => Math.round(max * fraction));

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={
          title
            ? `${title}. ${points.length} points, highest ${write(rawMax)}.`
            : `Trend chart, ${points.length} points.`
        }
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - box.left) / box.width;
          const position = ratio * width - padding.left;
          const index = Math.round((position / plotWidth) * (points.length - 1));
          setHover(Math.min(points.length - 1, Math.max(0, index)));
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={padding.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
              stroke={GRID}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={padding.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fill={AXIS}
            >
              {write(tick)}
            </text>
          </g>
        ))}

        <polygon points={area} fill={`url(#${gradientId})`} />

        {comparison && comparison.length === points.length ? (
          <polyline
            points={comparison
              .map((point, index) => `${x(index)},${y(point.value)}`)
              .join(" ")}
            fill="none"
            stroke={AXIS}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        <polyline
          points={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map((point, index) => (
          <circle
            key={`${point.label}-${index}`}
            cx={x(index)}
            cy={y(point.value)}
            r={active === index ? 4 : points.length > 24 ? 0 : 2.5}
            fill="var(--color-admin-card)"
            stroke={stroke}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {axisLabels(points).map(({ index, label }) => (
          <text
            key={`${label}-${index}`}
            x={x(index)}
            y={height - 8}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill={AXIS}
          >
            {label}
          </text>
        ))}
      </svg>

      {active !== null ? (
        <figcaption className="mt-1 text-xs text-admin-muted">
          <span className="font-medium text-admin-text">{points[active].label}</span>
          {" — "}
          {write(points[active].value)}
        </figcaption>
      ) : (
        <figcaption className="mt-1 text-xs text-admin-muted">
          {title ?? "Hover a point for its value."}
          {comparison ? " The dashed line is the previous period." : ""}
        </figcaption>
      )}
    </figure>
  );
}

/* ── Stacked columns ───────────────────────────────────────────────────── */

export type StackedColumnsProps = {
  points: SplitSeriesPoint[];
  keys: { key: string; label: string; colour: string }[];
  title?: string;
  height?: number;
  emptyLabel?: string;
};

/**
 * Two or more series side by side over time — the shape behind "signups by
 * role" and "bookings by status".
 */
export function StackedColumns({
  points,
  keys,
  title,
  height = 200,
  emptyLabel = "No activity in this period.",
}: StackedColumnsProps) {
  const [hover, setHover] = useState<number | null>(null);

  const total = points.reduce(
    (sum, point) => sum + keys.reduce((inner, key) => inner + (point.values[key.key] ?? 0), 0),
    0,
  );

  if (points.length === 0 || total === 0) {
    return <ChartEmpty height={height} label={emptyLabel} />;
  }

  const width = 720;
  const padding = { top: 16, right: 12, bottom: 26, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = niceCeiling(
    Math.max(
      ...points.map((point) =>
        keys.reduce((sum, key) => sum + (point.values[key.key] ?? 0), 0),
      ),
      1,
    ),
  );

  const slot = plotWidth / points.length;
  const barWidth = Math.max(2, Math.min(28, slot * 0.55));
  const y = (value: number) => padding.top + plotHeight - (value / max) * plotHeight;
  const legend = keys.map((key) => key.label).join(" and ");

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={title ? `${title}. ${legend}.` : `Column chart of ${legend}.`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - box.left) / box.width;
          const position = ratio * width - padding.left;
          const index = Math.floor(position / slot);
          setHover(index >= 0 && index < points.length ? index : null);
        }}
      >
        {[0, 0.5, 1].map((fraction) => {
          const tick = Math.round(max * fraction);

          return (
            <g key={fraction}>
              <line
                x1={padding.left}
                x2={padding.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                stroke={GRID}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <text x={padding.left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={AXIS}>
                {tick}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => {
          const centre = padding.left + slot * index + slot / 2;
          let cursor = padding.top + plotHeight;

          return (
            <g key={`${point.label}-${index}`} opacity={hover === null || hover === index ? 1 : 0.45}>
              {keys.map((key) => {
                const value = point.values[key.key] ?? 0;
                const barHeight = (value / max) * plotHeight;
                cursor -= barHeight;

                return value === 0 ? null : (
                  <rect
                    key={key.key}
                    x={centre - barWidth / 2}
                    y={cursor}
                    width={barWidth}
                    height={Math.max(1, barHeight)}
                    fill={key.colour}
                    rx="1.5"
                  />
                );
              })}
            </g>
          );
        })}

        {axisLabels(points).map(({ index, label }) => (
          <text
            key={`${label}-${index}`}
            x={padding.left + slot * index + slot / 2}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fill={AXIS}
          >
            {label}
          </text>
        ))}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-admin-muted">
        {keys.map((key) => (
          <span key={key.key} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: key.colour }}
            />
            {key.label}
          </span>
        ))}
        {hover !== null ? (
          <span className="text-admin-text">
            {points[hover].label}:{" "}
            {keys
              .map((key) => `${points[hover].values[key.key] ?? 0} ${key.label.toLowerCase()}`)
              .join(", ")}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/* ── Bar list ──────────────────────────────────────────────────────────── */

export type BarListProps = {
  rows: { label: string; value: number; hint?: string }[];
  title?: string;
  emptyLabel?: string;
  format?: ChartFormat;
};

/**
 * A ranked list drawn as bars.
 *
 * Chosen over a horizontal bar chart for leaderboards because the labels are
 * long — "Washing machine repair" does not fit under a column — and because the
 * number belongs beside the name rather than floating above it.
 */
export function BarList({
  rows,
  emptyLabel = "Nothing to rank yet.",
  format = "number",
}: BarListProps) {
  const write = formatter(format);

  if (rows.length === 0) {
    return <ChartEmpty height={140} label={emptyLabel} />;
  }

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-admin-text" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-admin-text">
              {write(row.value)}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-admin-surface">
            <div
              className="h-full rounded-full bg-admin-accent"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
          {row.hint ? <p className="mt-0.5 text-xs text-admin-muted">{row.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/* ── Donut ─────────────────────────────────────────────────────────────── */

export type DonutSlice = { label: string; value: number; colour: string };

export function DonutChart({
  slices,
  total,
  caption,
  emptyLabel = "Nothing recorded in this period.",
}: {
  slices: DonutSlice[];
  total?: number;
  caption?: string;
  emptyLabel?: string;
}) {
  const visible = slices.filter((slice) => slice.value > 0);
  const sum = total ?? visible.reduce((running, slice) => running + slice.value, 0);

  if (visible.length === 0 || sum === 0) {
    return <ChartEmpty height={160} label={emptyLabel} />;
  }

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={caption ?? "Breakdown"}>
        <g transform="translate(70 70) rotate(-90)">
          {visible.map((slice) => {
            const length = (slice.value / sum) * circumference;
            const dash = `${length} ${circumference - length}`;
            const element = (
              <circle
                key={slice.label}
                r={radius}
                fill="none"
                stroke={slice.colour}
                strokeWidth="16"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += length;

            return element;
          })}
        </g>
        <text
          x="70"
          y="66"
          textAnchor="middle"
          fontSize="22"
          fontWeight="600"
          fill="var(--color-admin-text)"
        >
          {sum.toLocaleString()}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="11" fill={AXIS}>
          total
        </text>
      </svg>

      <ul className="space-y-1.5 text-sm">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: slice.colour }}
            />
            <span className="text-admin-muted">{slice.label}</span>
            <span className="ml-auto font-medium tabular-nums text-admin-text">
              {slice.value.toLocaleString()}
            </span>
            <span className="w-10 text-right text-xs tabular-nums text-admin-muted">
              {sum === 0 ? "0%" : `${Math.round((slice.value / sum) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Pieces ────────────────────────────────────────────────────────────── */

/** A quiet panel-sized "nothing to draw", rather than an axis with no data. */
export function ChartEmpty({ height, label }: { height: number; label: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-admin-border bg-admin-surface/60 px-4 text-center text-sm text-admin-muted"
      style={{ minHeight: height }}
    >
      {label}
    </div>
  );
}

/**
 * Three x-axis labels at most.
 *
 * A thirty-point series with thirty labels is a smear, and the first and last
 * dates are the ones a reader actually looks for.
 */
function axisLabels(points: { label: string }[]): { index: number; label: string }[] {
  if (points.length <= 3) {
    return points.map((point, index) => ({ index, label: point.label }));
  }

  return [
    { index: 0, label: points[0].label },
    { index: Math.floor((points.length - 1) / 2), label: points[Math.floor((points.length - 1) / 2)].label },
    { index: points.length - 1, label: points[points.length - 1].label },
  ];
}

/**
 * Rounds an axis maximum up to something a person reads easily.
 *
 * An axis that ends at 37 is harder to scan than one that ends at 40, and the
 * rounding is what stops the top gridline label changing every time a single
 * booking lands.
 */
function niceCeiling(value: number): number {
  if (value <= 5) return 5;
  if (value <= 10) return 10;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;

  const step = normalised <= 1.2 ? 1.2 : normalised <= 1.5 ? 1.5 : normalised <= 2 ? 2 : normalised <= 3 ? 3 : normalised <= 4 ? 4 : normalised <= 5 ? 5 : normalised <= 7 ? 7 : 10;

  return step * magnitude;
}
