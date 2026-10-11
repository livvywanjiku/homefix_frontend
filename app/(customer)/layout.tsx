import type { ReactNode } from "react";
import { requireRole } from "@/lib/dal";
import { CustomerNav } from "./customer-nav";

/**
 * The customer workspace shell.
 *
 * The gate is repeated here rather than left to the pages: a layout renders for
 * every route beneath it, so this is the one place that guarantees no
 * `/dashboard` screen — including one added later — is reachable without the
 * role. `proxy.ts` redirects too, but only by reading the cookie.
 */
export default async function CustomerLayout({ children }: { children: ReactNode }) {
  await requireRole("customer");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <CustomerNav />
      <div className="mt-8">{children}</div>
    </div>
  );
}
