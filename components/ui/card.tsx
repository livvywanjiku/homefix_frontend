import type { ComponentProps, ReactNode } from "react";

/** A white surface on the grey page background. The default content container. */
export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-line bg-card shadow-sm ${className}`}
    />
  );
}

export function CardHeader({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 ${className}`}
    />
  );
}

export function CardTitle({
  as: Heading = "h2",
  className = "",
  ...props
}: ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
  return (
    <Heading
      {...props}
      className={`text-base font-semibold tracking-tight text-foreground ${className}`}
    />
  );
}

export function CardBody({ className = "", ...props }: ComponentProps<"div">) {
  return <div {...props} className={`px-5 py-4 ${className}`} />;
}

export function CardFooter({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={`flex flex-wrap items-center gap-3 border-t border-line px-5 py-4 ${className}`}
    />
  );
}

/** A label/value pair, used for the metadata blocks on detail pages. */
export function DescriptionItem({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {term}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}
