import type { ComponentProps, ReactNode } from "react";

/**
 * Table primitives.
 *
 * Wrapped in a horizontally scrollable container so a wide admin table degrades
 * to a scroll rather than breaking the page layout on a narrow screen.
 */
export function Table({ className = "", ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        {...props}
        className={`w-full border-collapse text-left text-sm ${className}`}
      />
    </div>
  );
}

export function THead({ className = "", ...props }: ComponentProps<"thead">) {
  return (
    <thead
      {...props}
      className={`border-b border-line bg-surface/60 text-xs tracking-wide text-muted-foreground uppercase ${className}`}
    />
  );
}

export function TBody({ className = "", ...props }: ComponentProps<"tbody">) {
  return <tbody {...props} className={`divide-y divide-line ${className}`} />;
}

export function TR({ className = "", ...props }: ComponentProps<"tr">) {
  return <tr {...props} className={`transition-colors hover:bg-surface/50 ${className}`} />;
}

export function TH({ className = "", ...props }: ComponentProps<"th">) {
  return <th {...props} className={`px-4 py-3 font-medium ${className}`} />;
}

export function TD({ className = "", ...props }: ComponentProps<"td">) {
  return <td {...props} className={`px-4 py-3 align-middle ${className}`} />;
}

/** Wraps a table so the card border and radius are applied once. */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
      {children}
    </div>
  );
}
